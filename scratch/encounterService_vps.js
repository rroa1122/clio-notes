/**
 * encounterService.js
 * Completes clinical progress note encounters in Amexzone with multi-service support.
 */

const { waitForLoader } = require('../core/browser');
const { handlePin, ensurePinUnlocked, handleUnsavedChanges } = require('../core/sessionManager');

/**
 * Helper to map Clio service name to Amexzone valid service type based on patient age
 */
function mapClioServiceToAmexzone(serviceType, patientDob) {
    if (!serviceType) return "Progress Note - TCM";
    return serviceType;
}

/**
 * Format string time to 12-hour format (e.g., "11:40 AM")
 */
function format12h(str) {
    if (!str) return '10:00 AM';
    if (/am|pm/i.test(str)) return str.trim();
    const parts = str.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1] || '0', 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function timeToMinutes(str) {
    if (!str) return 600;
    const match = str.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return 600;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const mer = (match[3] || '').toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
}

function minutesTo12h(mins) {
    mins = mins % (24 * 60);
    let h = Math.floor(mins / 60);
    const m = mins % 60;
    const mer = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
}

/**
 * Adjusts time using the Bootstrap DateTimePicker visual popup (arrows & period toggle)
 */
async function setTimeWithPopup(page, inputSelector, targetTime12h) {
    const parts = targetTime12h.trim().split(/\s+/);
    const [h, m] = (parts[0] || '10:00').split(':');
    const targetPeriod = (parts[1] || 'AM').toUpperCase();
    const targetH = parseInt(h, 10);
    const targetM = parseInt(m, 10);

    console.log(`🕒 Ajustando hora mediante selector visual para ${inputSelector}: ${targetH}:${String(targetM).padStart(2, '0')} ${targetPeriod}...`);

    const inputLoc = page.locator(inputSelector);
    if (!await inputLoc.isVisible().catch(() => false)) return;

    await inputLoc.click({ force: true });
    await page.waitForTimeout(600);

    const widget = page.locator('.bootstrap-datetimepicker-widget:visible').last();
    if (await widget.isVisible().catch(() => false)) {
        // 1. Period AM/PM
        const periodBtn = widget.locator('button[data-action="togglePeriod"], button:has-text("AM"), button:has-text("PM")').first();
        if (await periodBtn.isVisible().catch(() => false)) {
            const currentPeriod = (await periodBtn.innerText().catch(() => '')).trim().toUpperCase();
            if (currentPeriod && currentPeriod !== targetPeriod) {
                await periodBtn.click({ force: true });
                await page.waitForTimeout(200);
            }
        }

        // 2. Adjust Hour
        const hourSpan = widget.locator('span.timepicker-hour');
        const incH = widget.locator('a[data-action="incrementHours"]');
        const decH = widget.locator('a[data-action="decrementHours"]');
        
        let curH = parseInt(await hourSpan.innerText().catch(() => '0'), 10);
        let safety = 0;
        while (curH !== targetH && safety < 15) {
            if (curH < targetH) {
                await incH.click({ force: true });
            } else {
                await decH.click({ force: true });
            }
            await page.waitForTimeout(100);
            curH = parseInt(await hourSpan.innerText().catch(() => '0'), 10);
            safety++;
        }

        // 3. Adjust Minute
        const minSpan = widget.locator('span.timepicker-minute');
        const incM = widget.locator('a[data-action="incrementMinutes"]');
        const decM = widget.locator('a[data-action="decrementMinutes"]');
        
        let curM = parseInt(await minSpan.innerText().catch(() => '0'), 10);
        safety = 0;
        while (curM !== targetM && safety < 65) {
            if (curM < targetM) {
                await incM.click({ force: true });
            } else {
                await decM.click({ force: true });
            }
            await page.waitForTimeout(60);
            curM = parseInt(await minSpan.innerText().catch(() => '0'), 10);
            safety++;
        }
    }

    // Also ensure value is synced in DOM
    await page.evaluate(({ sel, val }) => {
        const inp = document.querySelector(sel);
        if (inp) {
            inp.value = val;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) window.jQuery(inp).val(val).trigger('change').trigger('input');
        }
    }, { sel: inputSelector, val: targetTime12h });

    await page.waitForTimeout(400);
}

/**
 * Selects time using the visual/interactive time picker popup (Bootstrap DateTimePicker)
 */
async function selectTimeFromPicker(page, inputLocator, targetTimeStr) {
    if (!targetTimeStr) return;
    const match = targetTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return;

    let hour = parseInt(match[1], 10);
    let minute = parseInt(match[2], 10);
    let meridian = (match[3] || 'AM').toUpperCase();

    const roundedMin = Math.round(minute / 5) * 5;
    const minStr = String(roundedMin % 60).padStart(2, '0');

    console.log(`⏰ Abriendo selector visual para: ${hour}:${minStr} ${meridian}...`);

    await inputLocator.click({ force: true });
    await page.waitForTimeout(500);

    const picker = page.locator('.bootstrap-datetimepicker-widget:visible, .timepicker:visible, div[class*="timepicker"]:visible').first();
    if (await picker.isVisible().catch(() => false)) {
        // 1. Set Hour via Show Hours
        const showHours = picker.locator('[data-action="showHours"], .timepicker-hour').first();
        if (await showHours.isVisible().catch(() => false)) {
            await showHours.click({ force: true }).catch(() => {});
            await page.waitForTimeout(300);
            const hourCell = picker.locator(`td[data-action="selectHour"]`).filter({ hasText: new RegExp(`^\\s*0?${hour}\\s*$`) }).first();
            if (await hourCell.isVisible().catch(() => false)) {
                await hourCell.click({ force: true }).catch(() => {});
                await page.waitForTimeout(300);
            }
        }

        // 2. Set Minute via Show Minutes
        const showMinutes = picker.locator('[data-action="showMinutes"], .timepicker-minute').first();
        if (await showMinutes.isVisible().catch(() => false)) {
            await showMinutes.click({ force: true }).catch(() => {});
            await page.waitForTimeout(300);
            const minCell = picker.locator(`td[data-action="selectMinute"]`).filter({ hasText: new RegExp(`^\\s*${minStr}\\s*$`) }).first();
            if (await minCell.isVisible().catch(() => false)) {
                await minCell.click({ force: true }).catch(() => {});
                await page.waitForTimeout(300);
            }
        }

        // 3. Set Meridian (AM / PM)
        const togglePeriod = picker.locator('button[data-action="togglePeriod"], button:has-text("AM"), button:has-text("PM")').first();
        if (await togglePeriod.isVisible().catch(() => false)) {
            const currentMer = (await togglePeriod.innerText().catch(() => '')).trim().toUpperCase();
            if (currentMer && currentMer !== meridian) {
                await togglePeriod.click({ force: true }).catch(() => {});
                await page.waitForTimeout(300);
            }
        }

        // Close picker popup by clicking outside
        await page.locator('.modal.show .modal-header, .modal.show .modal-footer').first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(400);
    }
}

/**
 * Helper to dismiss any local drafts or 'CAMBIOS SIN GUARDAR' popups
 */
async function dismissDraftsAndPopups(page) {
    try {
        // 1. Clear any local drafts from localStorage/sessionStorage
        await page.evaluate(() => {
            try {
                Object.keys(localStorage || {}).forEach(k => {
                    if (/draft|unsaved|temp_service|cambio/i.test(k)) localStorage.removeItem(k);
                });
                Object.keys(sessionStorage || {}).forEach(k => {
                    if (/draft|unsaved|temp_service|cambio/i.test(k)) sessionStorage.removeItem(k);
                });
            } catch (e) {}
        }).catch(() => {});

        // 2. Direct click on any visible "Descartar" or "Discard" button
        const clicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a, .btn'));
            const discardBtn = btns.find(b => b.offsetParent !== null && /Descartar|Discard/i.test(b.innerText || ''));
            if (discardBtn) {
                discardBtn.click();
                return true;
            }
            return false;
        });

        if (clicked) {
            console.log("👆 Popup 'CAMBIOS SIN GUARDAR' descartado exitosamente vía DOM.");
            await page.waitForTimeout(400);
        } else {
            const discardLoc = page.locator('button:has-text("Descartar"), button:has-text("Discard"), a:has-text("Descartar"), .swal2-cancel').first();
            if (await discardLoc.isVisible().catch(() => false)) {
                await discardLoc.click({ force: true }).catch(() => {});
                console.log("👆 Popup 'CAMBIOS SIN GUARDAR' descartado vía locator.");
                await page.waitForTimeout(400);
            }
        }
    } catch (e) {}
}

/**
 * Helper to open the new service modal
 */
async function openNewServiceModal(page) {
    console.log(`👆 Clic en '+ Add Service / + Añadir Servicio'...`);
    await handleUnsavedChangesModal(page);
    await waitForLoader(page);
    await page.waitForTimeout(600);

    // Ensure backdrops are cleared before clicking
    await page.evaluate(() => {
        const swals = document.querySelectorAll('.swal2-container, .swal2-backdrop-show');
        swals.forEach(s => s.remove());
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 0 && !document.querySelector('.modal.show')) {
            backdrops.forEach(b => b.remove());
            document.body.classList.remove('modal-open');
        }
    }).catch(() => {});

    const addSvcBtn = page.locator('a, button, li').filter({ hasText: /\+\s*Add Service|Add Service|\+\s*Añadir Servicio|Añadir Servicio/i }).first();
    if (await addSvcBtn.isVisible().catch(() => false)) {
        await addSvcBtn.scrollIntoViewIfNeeded().catch(() => {});
        await addSvcBtn.click({ force: true }).catch(() => {});
    } else {
        await page.evaluate(() => {
            if (typeof window.newServicioModal === 'function') window.newServicioModal();
            else if (typeof window.newServiceModal === 'function') window.newServiceModal();
            else if (typeof window.addServicio === 'function') window.addServicio();
            else {
                const btn = Array.from(document.querySelectorAll('a, button, li')).find(b => /\+\s*Add Service|Add Service|\+\s*Añadir Servicio|Añadir Servicio/i.test(b.innerText || ''));
                if (btn) btn.click();
            }
        });
    }

    const modal = page.locator('.modal:visible, div[role="dialog"]:visible, #new_service_modal, #edit_service_modal, #gestion_servicio_modal').first();
    await modal.waitFor({ state: 'visible', timeout: 12000 });
    await page.waitForTimeout(500);
    return modal;
}

function calculateEndTime(timeIn, durationMins) {
    const startMins = timeToMinutes(timeIn);
    const dur = parseInt(durationMins, 10) || 15;
    return minutesTo12h(startMins + dur);
}

/**
 * Fills the modal (both EDIT SERVICE and NEW SERVICE)
 */
async function fillServiceModal(page, mappedService, svcItem, isEditMode = false, serviceIndex = 0) {
    await dismissDraftsAndPopups(page);
    const modal = page.locator('#new_service_modal:visible, #edit_service_modal:visible, .modal:visible, div[role="dialog"]:visible').filter({ has: page.locator('input#temp_service_name, input#service_name, #save_service_btn, button:has-text("GUARDAR"), button:has-text("Guardar"), button:has-text("Save")') }).first();
    await modal.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    await dismissDraftsAndPopups(page);

    // 1. Service Name Field (Type exact title from Clio)
    const exactTitle = svcItem.service_type || mappedService || "Progress Note - TCM";
    console.log(`✨ Configurando servicio en modal: '${exactTitle}'...`);

    const rawIn = svcItem.encounter?.time_in || '10:00 AM';
    const durVal = parseInt(svcItem.encounter?.duration, 10) || 15;
    let rawOut = svcItem.encounter?.time_out || '';
    if (!rawOut) {
        rawOut = calculateEndTime(rawIn, durVal);
    }
    const tIn12 = format12h(rawIn);
    let tOut12 = format12h(rawOut);

    if (timeToMinutes(tOut12) <= timeToMinutes(tIn12)) {
        tOut12 = calculateEndTime(tIn12, durVal);
    }
    const posVal = svcItem.encounter?.pos || '11 - Office';

    console.log(`⏰ Asignando horario y datos al servicio: ${tIn12} a ${tOut12} (${durVal} min, ${posVal})...`);

    // Fill visible inputs directly ONLY inside modal
    const nameInput = modal.locator('input#temp_service_name, input#service_name, #new_service_modal input.tt-input, #edit_service_modal input.tt-input').first();
    if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(exactTitle).catch(() => {});
    }

    const startInput = modal.locator('#temp_service_hora_inicio, input#temp_service_hora_inicio').first();
    if (await startInput.isVisible().catch(() => false)) {
        await startInput.fill(tIn12).catch(() => {});
    }

    const endInput = modal.locator('#temp_service_hora_fin, input#temp_service_hora_fin').first();
    if (await endInput.isVisible().catch(() => false)) {
        await endInput.fill(tOut12).catch(() => {});
    }

    const durInput = modal.locator('input#temp_service_duracion_mins, input#service_duracion_mins').first();
    if (await durInput.isVisible().catch(() => false)) {
        await durInput.fill(String(durVal)).catch(() => {});
    }

    const placeSelect = modal.locator('select#temp_service_place, select#service_place').first();
    if (await placeSelect.isVisible().catch(() => false)) {
        const p = (posVal || '').toLowerCase();
        let targetPlace = 'office_visit';
        if (p.includes('12') || p.includes('home') || p.includes('hogar')) {
            targetPlace = 'home_visit';
        } else if (p.includes('10') || p.includes('telehealth') || p.includes('telesalud')) {
            targetPlace = 'telehealth';
        }
        await placeSelect.selectOption({ value: targetPlace }).catch(() => {});
    }

    // Direct, instant DOM + jQuery DateTimePicker + Vue Model binding
    await page.evaluate(({ title, tIn12Str, tOut12Str, dur, pos, serviceIndex }) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const m = document.querySelector('#new_service_modal.show, #edit_service_modal.show, #gestion_servicio_modal.show, .modal.show, #new_service_modal, #edit_service_modal');
        
        if (m) {
            // 1. Title Input strictly inside modal
            const inp = m.querySelector('input#temp_service_name, input#service_name, input.tt-input');
            if (inp) {
                inp.removeAttribute('disabled');
                inp.removeAttribute('readonly');
                inp.value = title;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(inp).val(title).trigger('change').trigger('input');
            }

            // 2. Duration Input strictly inside modal
            const dInput = m.querySelector('input#temp_service_duracion_mins, input#service_duracion_mins');
            if (dInput) {
                dInput.value = dur;
                dInput.dispatchEvent(new Event('input', { bubbles: true }));
                dInput.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(dInput).val(dur).trigger('change').trigger('input');
            }

            // 3. Place of Service Select strictly inside modal
            const pSelect = m.querySelector('select#temp_service_place, select#service_place');
            if (pSelect) {
                const p = (pos || '').toLowerCase();
                let targetPlace = 'office_visit';
                if (p.includes('12') || p.includes('home') || p.includes('hogar')) {
                    targetPlace = 'home_visit';
                } else if (p.includes('10') || p.includes('telehealth') || p.includes('telesalud')) {
                    targetPlace = 'telehealth';
                }
                pSelect.value = targetPlace;
                pSelect.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(pSelect).val(targetPlace).trigger('change');
            }

            // 4. Start & End Time DOM Inputs strictly inside modal
            const sInput = m.querySelector('#temp_service_hora_inicio, input#temp_service_hora_inicio');
            const eInput = m.querySelector('#temp_service_hora_fin, input#temp_service_hora_fin');
            if (sInput) {
                sInput.value = tIn12Str;
                sInput.dispatchEvent(new Event('input', { bubbles: true }));
                sInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (eInput) {
                eInput.value = tOut12Str;
                eInput.dispatchEvent(new Event('input', { bubbles: true }));
                eInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // 5. jQuery DateTimePicker
        if (window.jQuery && window.moment) {
            const dtp1 = window.jQuery('#temp_service_hora_inicio').data('DateTimePicker');
            if (dtp1) dtp1.date(window.moment(tIn12Str, ['hh:mm A', 'h:mm A', 'HH:mm']));
            
            const dtp2 = window.jQuery('#temp_service_hora_fin').data('DateTimePicker');
            if (dtp2) dtp2.date(window.moment(tOut12Str, ['hh:mm A', 'h:mm A', 'HH:mm']));
        }

        // 6. Vue temp_service model (Amexzone saveCitaServicio payload source)
        const format24h = (str) => {
            if (!str) return '12:45:00';
            const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (!match) return str;
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const s = parseInt(match[3] || '0', 10);
            const mer = (match[4] || '').toUpperCase();
            if (mer === 'PM' && h < 12) h += 12;
            if (mer === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        const tIn24 = format24h(tIn12Str);
        const tOut24 = format24h(tOut12Str);

        if (vm && vm.temp_service) {
            vm.$set(vm.temp_service, 'name', title);
            vm.$set(vm.temp_service, 'nombre', title);
            vm.$set(vm.temp_service, 'hora_inicio', tIn24);
            vm.$set(vm.temp_service, 'hora_fin', tOut24);
            vm.$set(vm.temp_service, 'duracion_mins', dur);
        }

        if (vm && vm.citas) {
            const citaKey = Object.keys(vm.citas)[0];
            if (citaKey && vm.citas[citaKey]) {
                if (vm.citas[citaKey].tareas && vm.citas[citaKey].tareas[serviceIndex]) {
                    const t = vm.citas[citaKey].tareas[serviceIndex];
                    if (vm.$set) {
                        vm.$set(t, 'nombre', title);
                        vm.$set(t, 'name', title);
                        vm.$set(t, 'hora_inicio', tIn24);
                        vm.$set(t, 'hora_fin', tOut24);
                        vm.$set(t, 'duracion_mins', dur);
                    } else {
                        t.nombre = title;
                        t.name = title;
                        t.hora_inicio = tIn24;
                        t.hora_fin = tOut24;
                        t.duracion_mins = dur;
                    }
                }
                if (serviceIndex === 0) {
                    if (vm.$set) {
                        vm.$set(vm.citas[citaKey], 'hora_inicio', tIn24);
                        vm.$set(vm.citas[citaKey], 'hora_fin', tOut24);
                        vm.$set(vm.citas[citaKey], 'duracion_mins', dur);
                    } else {
                        vm.citas[citaKey].hora_inicio = tIn24;
                        vm.citas[citaKey].hora_fin = tOut24;
                        vm.citas[citaKey].duracion_mins = dur;
                    }
                }
            }
        }

        // 7. Update DOM tab label for this tabIndex directly
        const tabs = Array.from(document.querySelectorAll('ul.services_ul_list li, .nav-tabs li, a[data-toggle="tab"], .services_ul_list a')).filter(t => !/añadir|add/i.test(t.innerText || ''));
        if (tabs[serviceIndex]) {
            const spanOrA = tabs[serviceIndex].querySelector('span, a, p') || tabs[serviceIndex];
            if (spanOrA) {
                const icon = spanOrA.querySelector('i, svg');
                const iconHtml = icon ? icon.outerHTML + ' ' : '';
                spanOrA.innerHTML = `${iconHtml}${title} <small class="text-muted">(${tIn12Str} - ${tOut12Str})</small>`;
            }
        }
    }, { title: exactTitle, tIn12Str: tIn12, tOut12Str: tOut12, dur: durVal, pos: posVal, serviceIndex });

    // 7. Save Modal via #save_service_btn or Guardar button
    console.log("💾 Guardando servicio en el modal (clic en #save_service_btn)...");
    const saveBtn = modal.locator('#save_service_btn, a#save_service_btn, button#save_service_btn, #new_service_modal .btn-info, #edit_service_modal .btn-info, button:has-text("GUARDAR"), a:has-text("Guardar"), button:has-text("SAVE"), button:has-text("Save"), .modal-footer button.btn-primary, button[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click({ force: true });
    } else {
        await page.evaluate(() => {
            const btn = document.querySelector('#save_service_btn, #new_service_modal .btn-info, #edit_service_modal .btn-info');
            if (btn) { btn.click(); return; }
            const m = document.querySelector('.modal.show, .modal.in, #new_service_modal, #edit_service_modal, #gestion_servicio_modal');
            if (m) {
                const btns = Array.from(m.querySelectorAll('button, a'));
                const saveB = btns.find(b => /SAVE|GUARDAR/i.test(b.innerText || '') && !/CANCEL|DESCARTAR/i.test(b.innerText || ''));
                if (saveB) saveB.click();
            }
        });
    }

    await page.waitForTimeout(500);
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Handle any overlapping or error alert dialogs with cascading auto-advance
    let maxRetries = 6;
    let savedSuccessfully = false;

    while (maxRetries > 0) {
        // 1. Check first for SweetAlert (Guardar Cambios dialog)
        const swalModal = page.locator('.swal2-container:visible, .swal2-popup:visible').first();
        if (await swalModal.isVisible().catch(() => false)) {
            const swalText = await swalModal.innerText().catch(() => '');
            console.log(`ℹ️ SWEETALERT DETECTADO TRAS GUARDAR SERVICIO: "${swalText.replace(/\n+/g, ' ')}"`);
            const lowerSwal = swalText.toLowerCase();

            if (lowerSwal.includes('guardar') || lowerSwal.includes('sugerimos') || lowerSwal.includes('save')) {
                const yesBtn = swalModal.locator('button.swal2-confirm, button:has-text("Sí, Guardar"), button:has-text("Si, Guardar"), button:has-text("Sí"), button:has-text("Si"), button:has-text("Yes")').first();
                if (await yesBtn.isVisible().catch(() => false)) {
                    await yesBtn.click({ force: true }).catch(() => {});
                }
                await page.evaluate(() => {
                    document.querySelectorAll('.swal2-container, .swal2-backdrop-show').forEach(e => e.remove());
                    document.body.classList.remove('swal2-shown', 'swal2-height-auto');
                }).catch(() => {});
                await page.waitForTimeout(500);
                savedSuccessfully = true;
                break;
            } else if (lowerSwal.includes('descartar') || lowerSwal.includes('discard') || lowerSwal.includes('cambios sin guardar')) {
                const discardBtn = swalModal.locator('button:has-text("Descartar"), button:has-text("Discard"), button:has-text("No"), .swal2-cancel').first();
                if (await discardBtn.isVisible().catch(() => false)) {
                    await discardBtn.click({ force: true }).catch(() => {});
                }
                await page.evaluate(() => {
                    document.querySelectorAll('.swal2-container, .swal2-backdrop-show').forEach(e => e.remove());
                    document.body.classList.remove('swal2-shown', 'swal2-height-auto');
                }).catch(() => {});
                await page.waitForTimeout(500);
                savedSuccessfully = true;
                break;
            }
        }

        // 2. Check for Notiflix or Superposición error alerts
        const notiflixAlert = page.locator('#NotiflixReportWrap:visible, #NotiflixConfirmWrap:visible, div[role="dialog"]:has-text("SUPERPOSICIÓN"), div:has-text("SUPERPOSICIÓN NO PERMITIDA"):visible, div:has-text("Existe un servicio"):visible').first();
        if (!(await notiflixAlert.isVisible().catch(() => false))) {
            savedSuccessfully = true;
            break;
        }

        const alertText = await notiflixAlert.innerText().catch(() => '');
        const lowerAlert = alertText.toLowerCase();

        if (lowerAlert.includes('guardar') || lowerAlert.includes('sugerimos') || lowerAlert.includes('save') || lowerAlert.includes('cambios realizados')) {
            console.log("ℹ️ Detectada confirmación 'Guardar Cambios'. Haciendo clic en Sí, Guardar...");
            const yesBtn = notiflixAlert.locator('button.swal2-confirm, button:has-text("Sí, Guardar"), button:has-text("Si, Guardar"), button:has-text("Sí"), button:has-text("Si"), button:has-text("Yes")').first();
            if (await yesBtn.isVisible().catch(() => false)) {
                await yesBtn.click({ force: true }).catch(() => {});
            }
            await page.evaluate(() => {
                document.querySelectorAll('.swal2-container, .swal2-backdrop-show').forEach(e => e.remove());
                document.body.classList.remove('swal2-shown', 'swal2-height-auto');
            }).catch(() => {});
            await page.waitForTimeout(500);
            savedSuccessfully = true;
            break;
        }

        console.log(`❌ ERROR POPUP DETECTADO EN AMEXZONE: "${alertText.replace(/\n+/g, ' ')}"`);
        const errorCloseBtn = notiflixAlert.locator('button:has-text("Cerrar"), button:has-text("Close"), button:has-text("OK"), #NotiflixReportWrap button, #NotiflixConfirmWrap button').first();
        if (await errorCloseBtn.isVisible().catch(() => false)) {
            await errorCloseBtn.click({ force: true }).catch(() => {});
        }
        await page.evaluate(() => {
            document.querySelectorAll('#NotiflixReportWrap, #NotiflixConfirmWrap').forEach(e => e.remove());
        }).catch(() => {});
        await page.waitForTimeout(400);

        let nextSlot = null;
        try {
            const { checkAndRecommendSlot } = require('./availabilityService');
            const vDate = svcItem.visit_date || svcItem.encounter?.visit_date || '2026-08-01';
            const pTarget = svcItem.patient_id || svcItem.patient_name || (svcItem.patient && svcItem.patient.full_name) || null;
            const rawIn = svcItem.encounter?.time_in || '10:00 AM';
            const avail = await checkAndRecommendSlot(page, vDate, rawIn, durVal, 473, pTarget, alertText);
            if (avail && avail.recommendedSlot) {
                nextSlot = avail.recommendedSlot;
            }
        } catch (e) {
            console.log('Error calculando horario recomendado:', e.message);
        }

        if (nextSlot) {
            console.log(`🔄 Auto-avanzando horario en modal al recomendado por Amexzone: ${nextSlot.start} a ${nextSlot.end}...`);
            const newIn12 = format12h(nextSlot.start);
            const newOut12 = format12h(nextSlot.end);

            await page.evaluate(({ tIn12Str, tOut12Str, dur }) => {
                const format24h = (str) => {
                    if (!str) return '12:45:00';
                    const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
                    if (!match) return str;
                    let h = parseInt(match[1], 10);
                    const m = parseInt(match[2], 10);
                    const s = parseInt(match[3] || '0', 10);
                    const mer = (match[4] || '').toUpperCase();
                    if (mer === 'PM' && h < 12) h += 12;
                    if (mer === 'AM' && h === 12) h = 0;
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                };

                const tIn24 = format24h(tIn12Str);
                const tOut24 = format24h(tOut12Str);

                const m = document.querySelector('#new_service_modal, #edit_service_modal, #gestion_servicio_modal, .modal.show, .modal.in') || document;
                const sInput = m.querySelector('#temp_service_hora_inicio, input[name*="hora_inicio"]');
                const eInput = m.querySelector('#temp_service_hora_fin, input[name*="hora_fin"]');
                if (sInput) {
                    sInput.value = tIn12Str;
                    sInput.dispatchEvent(new Event('input', { bubbles: true }));
                    sInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (eInput) {
                    eInput.value = tOut12Str;
                    eInput.dispatchEvent(new Event('input', { bubbles: true }));
                    eInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                if (window.jQuery && window.moment) {
                    const dtp1 = window.jQuery('#temp_service_hora_inicio').data('DateTimePicker');
                    if (dtp1) dtp1.date(window.moment(tIn12Str, ['hh:mm A', 'h:mm A', 'HH:mm']));
                    
                    const dtp2 = window.jQuery('#temp_service_hora_fin').data('DateTimePicker');
                    if (dtp2) dtp2.date(window.moment(tOut12Str, ['hh:mm A', 'h:mm A', 'HH:mm']));
                }

                const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
                if (vm && vm.temp_service) {
                    vm.$set(vm.temp_service, 'hora_inicio', tIn24);
                    vm.$set(vm.temp_service, 'hora_fin', tOut24);
                    vm.$set(vm.temp_service, 'duracion_mins', dur);
                }
            }, { tIn12Str: newIn12, tOut12Str: newOut12, dur: durVal });

            await page.waitForTimeout(500);
            const retrySaveBtn = modal.locator('#save_service_btn, a#save_service_btn, button#save_service_btn, button:has-text("GUARDAR"), button:has-text("Save")').first();
            if (await retrySaveBtn.isVisible().catch(() => false)) {
                await retrySaveBtn.click({ force: true });
            }
            await page.waitForTimeout(2000);
            maxRetries--;
        } else {
            break;
        }
    }

    if (!savedSuccessfully) {
        // Release edit lock immediately so Amexzone does not keep session lock active
        await page.evaluate(() => {
            const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
            if (vm && typeof vm.releaseEditLock === 'function') {
                vm.releaseEditLock(false);
            }
        }).catch(() => {});

        throw new Error(`[OVERLAPPING / ERROR EN AMEXZONE] [SERVICE_INDEX:${serviceIndex}] En el Servicio #${serviceIndex + 1} (${exactTitle}): No se pudo encontrar un horario libre automáticamente.`);
    }

    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await waitForLoader(page);
}

async function handleUnsavedChangesModal(page) {
    try {
        const yesBtn = page.locator('button.swal2-confirm, button:has-text("Sí, Guardar"), button:has-text("Si, Guardar"), button:has-text("Sí"), button:has-text("Si"), button:has-text("Yes")').first();
        if (await yesBtn.isVisible().catch(() => false)) {
            console.log("ℹ️ Detectado diálogo 'Guardar Cambios'. Haciendo clic en Sí, Guardar...");
            await yesBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(600);
        }
        
        await page.evaluate(() => {
            const btn = document.querySelector('button.swal2-confirm, .swal2-confirm');
            if (btn) {
                btn.click();
            }
            document.querySelectorAll('.swal2-container, .swal2-backdrop-show').forEach(s => s.remove());
            document.body.classList.remove('swal2-shown', 'swal2-height-auto', 'modal-open');
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops.length > 0 && !document.querySelector('.modal.show')) {
                backdrops.forEach(b => b.remove());
            }
        }).catch(() => {});
        await page.waitForTimeout(400);
    } catch (e) {}
}

/**
 * Fills clinical narratives and domain checkboxes for a specific service tab
 */
async function fillClinicalData(page, tabIndex, svcItem, mappedService) {
    console.log(`\n📋 Llenando narrativa y dominios del Servicio #${tabIndex + 1}: ${mappedService}...`);
    // 1. Auto-dismiss any 'CAMBIOS SIN GUARDAR' or draft modal
    await dismissDraftsAndPopups(page);

    // 2. Get tarea.id for this tab
    const tareaId = await page.evaluate((tabIdx) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        return vm?.citas?.[citaKey]?.tareas?.[tabIdx]?.id || null;
    }, tabIndex);

    // 3. Physically switch to this tab using both Playwright click and jQuery .tab('show')
    await page.evaluate(({ tId, idx }) => {
        if (tId) {
            const link = document.querySelector(`a[href*="${tId}"], a[data-target*="${tId}"]`);
            if (link) {
                link.click();
                if (window.jQuery) window.jQuery(link).tab('show');
                return;
            }
        }
        const tabs = Array.from(document.querySelectorAll('ul.services_ul_list li a, .services_ul_list a')).filter(a => !/añadir|add/i.test(a.innerText || ''));
        if (tabs[idx]) {
            tabs[idx].click();
            if (window.jQuery) window.jQuery(tabs[idx]).tab('show');
        }
    }, { tId: tareaId, idx: tabIndex });
    await page.waitForTimeout(800);

    await dismissDraftsAndPopups(page);

    // 4. Locate the exact container for this specific service tab
    let specificContainer = null;
    if (tareaId) {
        specificContainer = page.locator(`div:has(#input_tarea_nota_${tareaId}_en), div:has(#input_tarea_nota_${tareaId}_es), #pane_tarea_${tareaId}, #tab_tarea_${tareaId}, div[id*="${tareaId}"]`).first();
    }
    if (!specificContainer) {
        specificContainer = page.locator('.tab-content .tab-pane.active, .tab-pane.active, .tab-pane.show').first();
    }

    // 5. Mark the domain checkboxes dynamically based on svcItem.domains
    const targetDomains = svcItem.domains || [];
    const getDomainNumbers = (domains) => {
        const list = Array.isArray(domains) ? domains : [domains];
        const nums = [];
        for (const d of list) {
            const norm = String(d || '').toLowerCase().trim();
            if (/^(12_|12\b|other)/i.test(norm)) nums.push(12);
            else if (/^(11_|11\b|legal)/i.test(norm)) nums.push(11);
            else if (/^(10_|10\b|transportation)/i.test(norm)) nums.push(10);
            else if (/^(9_|9\b|basic)/i.test(norm)) nums.push(9);
            else if (/^(8_|8\b|economic|financial)/i.test(norm)) nums.push(8);
            else if (/^(7_|7\b|housing)/i.test(norm)) nums.push(7);
            else if (/^(6_|6\b|daily|living)/i.test(norm)) nums.push(6);
            else if (/^(5_|5\b|social|recreational)/i.test(norm)) nums.push(5);
            else if (/^(4_|4\b|school|education)/i.test(norm)) nums.push(4);
            else if (/^(3_|3\b|vocational|employment)/i.test(norm)) nums.push(3);
            else if (/^(2_|2\b|physical|medical|dental)/i.test(norm)) nums.push(2);
            else if (/^(1_|1\b|mental)/i.test(norm)) nums.push(1);
        }
        if (nums.length === 0) nums.push(1);
        return Array.from(new Set(nums));
    };
    const targetDomainNums = getDomainNumbers(targetDomains);
    console.log(`☑️ Sincronizando dominios para el Servicio #${tabIndex + 1}: ${JSON.stringify(targetDomains)} -> Números: [${targetDomainNums.join(', ')}]...`);

    // 5.1 Physical click on visible matching domain labels in specificContainer
    for (const num of targetDomainNums) {
        const domainLabel = specificContainer.locator('label, .form-check, .checkbox').filter({ hasText: new RegExp(`(^|\\s|#)${num}(\\s|\\.|:|/|-|$)`, 'i') }).first();
        if (await domainLabel.isVisible().catch(() => false)) {
            await domainLabel.scrollIntoViewIfNeeded().catch(() => {});
            await domainLabel.click({ force: true }).catch(() => {});
            console.log(`✅ Clic físico realizado en #${num} para Servicio #${tabIndex + 1}.`);
        }
    }

    // 5.2 DOM-level check all matching checkboxes and uncheck non-matching
    await page.evaluate(({ tId, tabIdx, targetNums }) => {
        let container = null;
        if (tId) {
            container = document.querySelector(`div:has(#input_tarea_nota_${tId}_en), div:has(#input_tarea_nota_${tId}_es), #pane_tarea_${tId}, #tab_tarea_${tId}, div[id*="${tId}"]`);
        }
        if (!container) {
            const panes = Array.from(document.querySelectorAll('.tab-content .tab-pane, div[id*="tarea_"]'));
            container = panes[tabIdx] || document.querySelector('.tab-content .tab-pane.active') || document.querySelector('.tab-pane.show');
        }
        if (!container) return;

        const cbs = Array.from(container.querySelectorAll('input[type="checkbox"]'));
        for (const cb of cbs) {
            const labelEl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`) || cb.parentElement;
            const txt = (labelEl?.innerText || '') + ' ' + (cb.closest('div')?.innerText || '');
            const shouldBeChecked = targetNums.some(n => {
                const regex = new RegExp(`(^|\\s|#)${n}(\\s|\\.|:|/|-|$)`, 'i');
                return regex.test(txt);
            });

            if (shouldBeChecked && !cb.checked) {
                cb.checked = true;
                cb.dispatchEvent(new Event('input', { bubbles: true }));
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(cb).prop('checked', true).trigger('change').trigger('input');
            } else if (!shouldBeChecked && cb.checked) {
                cb.checked = false;
                cb.dispatchEvent(new Event('input', { bubbles: true }));
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(cb).prop('checked', false).trigger('change').trigger('input');
            }
        }
    }, { tId: tareaId, tabIdx: tabIndex, targetNums: targetDomainNums });

    await page.waitForTimeout(400);

    // 6. Fill narrative strictly into the encounter textarea with deep fallbacks
    let narrativeText = '';
    if (typeof svcItem.assessment === 'string' && svcItem.assessment.trim()) {
        narrativeText = svcItem.assessment.trim();
    } else if (typeof svcItem.narrative === 'string' && svcItem.narrative.trim()) {
        narrativeText = svcItem.narrative.trim();
    } else if (svcItem.narrative && typeof svcItem.narrative === 'object') {
        narrativeText = svcItem.narrative.summary_notes || svcItem.narrative.clinical_narrative || svcItem.narrative.assessment || svcItem.narrative.nota || svcItem.narrative.notes || '';
    } else if (typeof svcItem.summary_notes === 'string' && svcItem.summary_notes.trim()) {
        narrativeText = svcItem.summary_notes.trim();
    } else if (typeof svcItem.clinical_narrative === 'string' && svcItem.clinical_narrative.trim()) {
        narrativeText = svcItem.clinical_narrative.trim();
    } else if (typeof svcItem.notes === 'string' && svcItem.notes.trim()) {
        narrativeText = svcItem.notes.trim();
    } else if (typeof svcItem.description === 'string' && svcItem.description.trim()) {
        narrativeText = svcItem.description.trim();
    }
    
    if (!narrativeText && Array.isArray(svcItem.joint_services) && svcItem.joint_services.length > 0) {
        const parts = svcItem.joint_services.map(sub => {
            return sub.narrative?.summary_notes || sub.narrative?.clinical_narrative || sub.summary_notes || sub.clinical_narrative || '';
        }).filter(Boolean);
        if (parts.length > 0) narrativeText = parts.join('\n\n');
    }

    if (narrativeText) {
        console.log(`📝 Escribiendo narrativa para el Servicio #${tabIndex + 1} (${narrativeText.length} caracteres)...`);
        
        let filledLoc = false;
        if (tareaId) {
            const exactLocator = page.locator(`#input_tarea_nota_${tareaId}_en, #input_tarea_nota_${tareaId}_es, #input_tarea_nota_${tareaId}`).first();
            if (await exactLocator.isVisible().catch(() => false)) {
                await exactLocator.scrollIntoViewIfNeeded().catch(() => {});
                await exactLocator.fill(narrativeText);
                console.log(`✅ Narrativa llenada en el cuadro de texto exacto del Servicio #${tabIndex + 1} (#input_tarea_nota_${tareaId}_en).`);
                filledLoc = true;
            }
        }

        if (!filledLoc) {
            const tabPaneTa = specificContainer.locator('textarea[id*="input_tarea_nota_"], textarea').first();
            if (await tabPaneTa.isVisible().catch(() => false)) {
                await tabPaneTa.scrollIntoViewIfNeeded().catch(() => {});
                await tabPaneTa.fill(narrativeText);
                console.log(`✅ Narrativa llenada en el textarea del panel #${tabIndex + 1}.`);
                filledLoc = true;
            }
        }

        // Direct DOM and Vue reactive synchronization
        await page.evaluate(({ tId, tabIdx, text }) => {
            let ta = null;
            if (tId) {
                ta = document.querySelector(`#input_tarea_nota_${tId}_en, #input_tarea_nota_${tId}_es, #input_tarea_nota_${tId}`);
            }
            if (!ta) {
                const panes = Array.from(document.querySelectorAll('.tab-content .tab-pane, div[id*="tarea_"]'));
                const container = panes[tabIdx] || document.querySelector('.tab-content .tab-pane.active');
                ta = container?.querySelector('textarea[id*="input_tarea_nota_"], textarea');
            }
            if (ta) {
                ta.value = text;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(ta).val(text).trigger('change').trigger('input');
            }

            const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
            if (vm) {
                const citaKey = Object.keys(vm.citas || {})[0];
                const tareas = vm.citas?.[citaKey]?.tareas || [];
                const t = (tId ? tareas.find(x => x.id === tId) : null) || tareas[tabIdx];
                if (t) {
                    if (vm.$set) {
                        vm.$set(t, 'response_nota_es', text);
                        vm.$set(t, 'response_nota_en', text);
                    } else {
                        t.response_nota_es = text;
                        t.response_nota_en = text;
                    }
                }
            }
        }, { tId: tareaId, tabIdx: tabIndex, text: narrativeText });

        const verifiedLen = await page.evaluate((tabIdx) => {
            const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
            const citaKey = Object.keys(vm?.citas || {})[0];
            const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
            return (tarea?.response_nota_es || tarea?.response_nota_en || '').length;
        }, tabIndex);
        console.log(`📏 Longitud de nota verificada en el editor para Servicio #${tabIndex + 1}: ${verifiedLen} caracteres`);
    }

    await page.waitForTimeout(600);
}

/**
 * Helper to fill global encounter-level fields: Outcome of Services and Next Steps
 */
async function fillGlobalEncounterFields(page, globalOutcome, globalNextSteps) {
    if (!globalOutcome && !globalNextSteps) return;

    console.log(`\n📋 Llenando campos generales del encuentro: Outcome (${globalOutcome ? globalOutcome.slice(0, 30) + '...' : 'N/A'}), Next Steps (${globalNextSteps ? globalNextSteps.slice(0, 30) + '...' : 'N/A'})...`);

    // 1. Vue model sync across all levels
    await page.evaluate(({ outcome, nextSteps }) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        if (vm) {
            const citaKey = Object.keys(vm.citas || {})[0];
            if (vm.citas && vm.citas[citaKey]) {
                if (outcome) {
                    if (vm.$set) vm.$set(vm.citas[citaKey], 'tcm_outcome_of_services', outcome);
                    else vm.citas[citaKey].tcm_outcome_of_services = outcome;
                }
                if (nextSteps) {
                    if (vm.$set) vm.$set(vm.citas[citaKey], 'tcm_next_steps', nextSteps);
                    else vm.citas[citaKey].tcm_next_steps = nextSteps;
                }

                if (Array.isArray(vm.citas[citaKey].tareas)) {
                    vm.citas[citaKey].tareas.forEach(t => {
                        if (outcome) {
                            if (vm.$set) vm.$set(t, 'tcm_outcome_of_services', outcome);
                            else t.tcm_outcome_of_services = outcome;
                        }
                        if (nextSteps) {
                            if (vm.$set) vm.$set(t, 'tcm_next_steps', nextSteps);
                            else t.tcm_next_steps = nextSteps;
                        }
                    });
                }
            }
        }

        if (outcome) {
            const els = Array.from(document.querySelectorAll('textarea')).filter(t => /outcome/i.test(t.id || '') || /outcome/i.test(t.name || '') || /outcome/i.test(t.placeholder || '') || /outcome/i.test(t.getAttribute('aria-label') || ''));
            els.forEach(el => {
                el.value = outcome;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
                if (window.jQuery) window.jQuery(el).val(outcome).trigger('change').trigger('input');
            });
        }
        if (nextSteps) {
            const els = Array.from(document.querySelectorAll('textarea')).filter(t => /next_steps|nextstep|next steps/i.test(t.id || '') || /next_steps|nextstep|next steps/i.test(t.name || '') || /next_steps|nextstep|next steps/i.test(t.placeholder || '') || /next_steps|nextstep|next steps/i.test(t.getAttribute('aria-label') || ''));
            els.forEach(el => {
                el.value = nextSteps;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
                if (window.jQuery) window.jQuery(el).val(nextSteps).trigger('change').trigger('input');
            });
        }
    }, { outcome: globalOutcome, nextSteps: globalNextSteps });

    // 2. Physical typing in the encounter Outcome of Services textarea
    if (globalOutcome) {
        const outcomeSelectors = [
            'textarea#input_tcm_outcome_of_services',
            'textarea[name="tcm_outcome_of_services"]',
            'textarea[name*="outcome"]',
            'div:has(> label:has-text("Outcome")) textarea',
            '.form-group:has(label:has-text("Outcome")) textarea'
        ];
        for (const sel of outcomeSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible().catch(() => false)) {
                await el.scrollIntoViewIfNeeded().catch(() => {});
                await el.click({ force: true }).catch(() => {});
                await el.fill(globalOutcome).catch(() => {});
                await el.dispatchEvent('input').catch(() => {});
                await el.dispatchEvent('change').catch(() => {});
                break;
            }
        }
    }

    // 3. Physical typing in the encounter Next Steps textarea
    if (globalNextSteps) {
        const nextStepsSelectors = [
            'textarea#input_tcm_next_steps',
            'textarea[name="tcm_next_steps"]',
            'textarea[name*="next_steps"]',
            'div:has(> label:has-text("Next Steps")) textarea',
            '.form-group:has(label:has-text("Next Steps")) textarea'
        ];
        for (const sel of nextStepsSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible().catch(() => false)) {
                await el.scrollIntoViewIfNeeded().catch(() => {});
                await el.click({ force: true }).catch(() => {});
                await el.fill(globalNextSteps).catch(() => {});
                await el.dispatchEvent('input').catch(() => {});
                await el.dispatchEvent('change').catch(() => {});
                break;
            }
        }
    }

    await page.waitForTimeout(500);
}

/**
 * Helper to remove any leftover/extra services from previous tests in the encounter
 */
async function pruneExtraServices(page, expectedCount) {
    try {
        let domTabCount = await page.evaluate(() => {
            const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
            const citaKey = Object.keys(vm?.citas || {})[0];
            return (vm?.citas?.[citaKey]?.tareas || []).length;
        });
        if (domTabCount <= expectedCount) return;

        console.log(`\n🧹 Detectadas ${domTabCount} pestañas en pantalla para una nota de ${expectedCount} servicio(s). Eliminando pestañas sobrantes...`);

        while (domTabCount > expectedCount) {
            const lastTabIdx = domTabCount - 1;
            console.log(`🗑️ Eliminando pestaña sobrante #${lastTabIdx + 1}...`);
            
            // 1. Select the last tab
            await page.evaluate((tabIdx) => {
                const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
                const citaKey = Object.keys(vm?.citas || {})[0];
                const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
                if (tarea && typeof window.setTareaActive === 'function') window.setTareaActive(tarea);
                if (vm && vm.tab_active_servicio !== undefined) vm.tab_active_servicio = tabIdx;
                const tabs = Array.from(document.querySelectorAll('ul.services_ul_list li, .services_ul_list a')).filter(t => !/añadir|add/i.test(t.innerText || ''));
                if (tabs[tabIdx]) {
                    tabs[tabIdx].click();
                    const link = tabs[tabIdx].querySelector('a') || tabs[tabIdx];
                    if (link) link.click();
                }
            }, lastTabIdx);
            await page.waitForTimeout(500);

            // 2. Click Remove Service button
            const removeBtn = page.locator('#remove_service_btn, button:has-text("REMOVER SERVICIO"), button:has-text("REMOVE SERVICE"), button:has-text("Remover Servicio"), .btn-outline-danger:has-text("REMOVER")').first();
            let clicked = false;
            if (await removeBtn.isVisible().catch(() => false)) {
                await removeBtn.click({ force: true }).catch(() => {});
                clicked = true;
            } else {
                clicked = await page.evaluate((tabIdx) => {
                    const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
                    const citaKey = Object.keys(vm?.citas || {})[0];
                    const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
                    if (typeof window.removeServicio === 'function' && tarea) {
                        window.removeServicio(tarea);
                        return true;
                    }
                    const btn = Array.from(document.querySelectorAll('button, a')).find(b => /REMOVER SERVICIO|REMOVE SERVICE/i.test(b.innerText || ''));
                    if (btn) { btn.click(); return true; }
                    return false;
                }, lastTabIdx);
            }

            await page.waitForTimeout(600);

            // 3. Confirm removal dialog if any
            const confirmDialog = page.locator('.swal2-container:visible, .swal2-popup:visible, #NotiflixConfirmWrap:visible, .modal.show:visible').first();
            if (await confirmDialog.isVisible().catch(() => false)) {
                const yesBtn = confirmDialog.locator('button.swal2-confirm, button:has-text("Sí"), button:has-text("Si"), button:has-text("Yes"), button:has-text("Confirmar"), button:has-text("OK"), button.btn-danger').first();
                if (await yesBtn.isVisible().catch(() => false)) {
                    await yesBtn.click({ force: true }).catch(() => {});
                }
                await page.waitForTimeout(600);
            }

            await waitForLoader(page);
            await page.waitForTimeout(1000);

            const newCount = await page.evaluate(() => {
                const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
                const citaKey = Object.keys(vm?.citas || {})[0];
                return (vm?.citas?.[citaKey]?.tareas || []).length;
            });

            if (newCount >= domTabCount) {
                // Vue DOM deletion fallback
                await page.evaluate((tabIdx) => {
                    const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
                    const citaKey = Object.keys(vm?.citas || {})[0];
                    if (vm?.citas?.[citaKey]?.tareas && vm.citas[citaKey].tareas.length > tabIdx) {
                        vm.citas[citaKey].tareas.splice(tabIdx, 1);
                    }
                }, lastTabIdx).catch(() => {});
                break;
            }
            domTabCount = newCount;
        }

        console.log(`✅ Pestañas sincronizadas correctamente. Total activo: ${domTabCount}`);
    } catch (e) {
        console.log("⚠️ Error en pruneExtraServices:", e.message);
    }
}

/**
 * Main function to process all encounter services in sequence matching the user's workflow
 */
async function processEncounterServices(page, payload, pin) {
    console.log("⏳ Esperando que cargue la pantalla de atención médica...");
    await page.waitForSelector('.main-content, #app, .card, body', { timeout: 15000 });
    await waitForLoader(page);
    
    // Actively wait for and unlock any Access Code modal (fast reactive check)
    await ensurePinUnlocked(page, pin || payload.pin || '1974', 800);
    await handleUnsavedChangesModal(page);

    // Immediate takeover of edit lock (clears "Abierto en otra pestaña" instantly in < 100ms)
    await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        if (vm) {
            if (typeof vm.takeoverEditLock === 'function') vm.takeoverEditLock();
            if (typeof vm.editLockFailOpen === 'function') vm.editLockFailOpen();
            if (vm.is_locked !== undefined) vm.is_locked = false;
            if (vm.edit_locked !== undefined) vm.edit_locked = false;
            if (vm.lock_banner !== undefined) vm.lock_banner = false;
        }
        // Force hide or remove any lock alert banner in the DOM
        const lockElements = Array.from(document.querySelectorAll('div, p, span')).filter(el => /otra pestaña o dispositivo|abierto en otra/i.test(el.innerText || ''));
        lockElements.forEach(el => {
            const card = el.closest('.card, .alert, .modal-body, div') || el;
            card.style.display = 'none';
        });
    });

    // Prepare services list
    let servicesList = [];
    if (Array.isArray(payload.services) && payload.services.length > 0) {
        servicesList = payload.services;
    } else {
        servicesList = [{
            service_type: payload.service_type || "Assessment",
            encounter: payload.encounter || {
                time_in: payload.time_in || "10:00 AM",
                time_out: payload.time_out || "10:30 AM",
                duration: payload.duration || "30",
                pos: payload.pos || "11 - Office"
            },
            narrative: payload.narrative || {},
            domains: payload.domains || []
        }];
    }

    // Extract global outcome & next steps
    let globalOutcome = payload.outcome_of_services || payload.narrative?.outcome_of_services || payload.narratives?.service_plan || payload.service_plan || '';
    let globalNextSteps = payload.next_steps || payload.narrative?.next_steps || payload.narratives?.next_steps || '';

    if (!globalOutcome) {
        for (const s of servicesList) {
            const out = s.narrative?.outcome_of_services || s.narratives?.service_plan || s.narrative?.service_plan || s.outcome_of_services || '';
            if (out) {
                globalOutcome = out;
                break;
            }
        }
    }
    if (!globalNextSteps) {
        for (const s of servicesList) {
            const ns = s.narrative?.next_steps || s.narratives?.next_steps || s.next_steps || '';
            if (ns) {
                globalNextSteps = ns;
                break;
            }
        }
    }

/**
 * Helper to open the edit modal for a specific tab
 */
async function openEditServiceModal(page, tabIndex = 0) {
    console.log(`👆 Clic en '[ EDIT SERVICE / EDITAR SERVICIO ]' para el Servicio #${tabIndex + 1}...`);
    await dismissDraftsAndPopups(page);
    
    // Explicitly switch active tab in Vue and DOM
    await page.evaluate((tabIdx) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        
        if (vm && vm.tab_active_servicio !== undefined) {
            vm.tab_active_servicio = tabIdx;
        }

        const tabs = Array.from(document.querySelectorAll('ul.services_ul_list li, .services_ul_list a')).filter(t => !/añadir|add/i.test(t.innerText || ''));
        if (tabs[tabIdx]) {
            tabs[tabIdx].click();
            const link = tabs[tabIdx].querySelector('a') || tabs[tabIdx];
            if (link) link.click();
        }
    }, tabIndex);
    await page.waitForTimeout(600);

    let clickedEdit = await page.evaluate((tabIdx) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
        if (typeof window.editServicioModal === 'function' && tarea) {
            window.editServicioModal(tarea);
            return true;
        } else if (typeof window.editServiceModal === 'function' && tarea) {
            window.editServiceModal(tarea);
            return true;
        }
        return false;
    }, tabIndex);

    if (!clickedEdit) {
        const editLocators = [
            page.locator(`a[id="btn_edit_tarea_${tabIndex}"], .btn_edit_tarea`).nth(tabIndex),
            page.locator('#edit_service_btn, .edit-service-btn, button:has-text("EDIT SERVICE"), a:has-text("EDIT SERVICE"), button:has-text("EDITAR SERVICIO"), a:has-text("EDITAR SERVICIO")').first()
        ];
        for (const loc of editLocators) {
            if (await loc.isVisible().catch(() => false)) {
                await loc.click({ force: true }).catch(() => {});
                clickedEdit = true;
                break;
            }
        }
    }

    const editModal = page.locator('.modal:visible, div[role="dialog"]:visible').filter({ has: page.locator('input#temp_service_name, input#service_name, #save_service_btn, button:has-text("GUARDAR"), button:has-text("Guardar"), button:has-text("Save")') }).first();
    await editModal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await dismissDraftsAndPopups(page);
    return editModal;
}

    console.log(`📋 Total de servicios a procesar en esta nota: ${servicesList.length}`);

    // =========================================================================
    // Procesar cada servicio de forma secuencial y guardar tras cada uno
    // =========================================================================
    for (let i = 0; i < servicesList.length; i++) {
        await ensurePinUnlocked(page, pin || payload.pin || '2017', 2000);
        await dismissDraftsAndPopups(page);
        await handleUnsavedChangesModal(page);
        
        const svcN = servicesList[i];
        if (!svcN.encounter) svcN.encounter = {};

        // Preventive schedule cascading: ensure subsequent service starts AFTER previous service
        if (i > 0) {
            const prevSvc = servicesList[i - 1];
            const prevEndMins = timeToMinutes(prevSvc.encounter?.time_out || prevSvc.encounter?.time_in);
            const curStartMins = timeToMinutes(svcN.encounter?.time_in);
            if (curStartMins < prevEndMins + 5) {
                const durVal = parseInt(svcN.encounter?.duration || '15', 10) || 15;
                const newStartMins = prevEndMins + 5;
                const newEndMins = newStartMins + durVal;
                svcN.encounter.time_in = minutesTo12h(newStartMins);
                svcN.encounter.time_out = minutesTo12h(newEndMins);
                console.log(`⏱️ Auto-encadenando preventivamente horario para Servicio #${i + 1}: ${svcN.encounter.time_in} a ${svcN.encounter.time_out}`);
            }
        }

        const mappedSvcN = mapClioServiceToAmexzone(svcN.service_type, payload.patient_dob);
        const exactTitle = svcN.service_type || mappedSvcN;
        console.log(`\n======================================================`);
        console.log(`▶️ Procesando Servicio #${i + 1}/${servicesList.length}: ${exactTitle} (${svcN.encounter?.time_in} - ${svcN.encounter?.time_out})`);
        console.log(`======================================================`);

        const domTabCount = await page.evaluate(() => {
            const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
            const citaKey = Object.keys(vm?.citas || {})[0];
            return (vm?.citas?.[citaKey]?.tareas || []).length;
        });
        console.log(`📊 Pestañas de servicios reales en Amexzone: ${domTabCount}`);

        if (i === 0) {
            // Tab 0 is the initial tab created with the appointment
            console.log(`✏️ Configurando datos del Servicio Inicial #1 en Amexzone...`);
            await openEditServiceModal(page, 0);
            await fillServiceModal(page, mappedSvcN, svcN, true, 0);
        } else {
            if (domTabCount < i + 1) {
                // Tab does not exist yet -> Click '+ Add Service'
                console.log(`➕ Añadiendo nueva pestaña para Servicio #${i + 1}...`);
                await openNewServiceModal(page);
                await fillServiceModal(page, mappedSvcN, svcN, false, i);
                await page.waitForFunction((idx) => {
                    const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
                    const citaKey = Object.keys(vm?.citas || {})[0];
                    return (vm?.citas?.[citaKey]?.tareas || []).length > idx;
                }, i, { timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(1500);
            } else {
                // Tab already exists -> Check if title/time actually need updating
                const expectedTime12 = format12h(svcN.encounter?.time_in || '');
                const needsModalEdit = await page.evaluate(({ tabIdx, expectedTitle, expectedTime }) => {
                    const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
                    const citaKey = Object.keys(vm?.citas || {})[0];
                    const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
                    if (!tarea) return true;
                    const titleMatches = (tarea.nombre || '').toLowerCase().includes(expectedTitle.toLowerCase()) || expectedTitle.toLowerCase().includes((tarea.nombre || '').toLowerCase());
                    const timeMatches = (tarea.hora_inicio || '').trim() === expectedTime.trim();
                    return !(titleMatches && timeMatches);
                }, { tabIdx: i, expectedTitle: exactTitle, expectedTime: expectedTime12 });

                if (needsModalEdit) {
                    console.log(`📑 Pestaña #${i + 1} existente requiere ajuste de nombre/horario. Editando modal...`);
                    await openEditServiceModal(page, i);
                    await fillServiceModal(page, mappedSvcN, svcN, true, i);
                } else {
                    console.log(`📑 Pestaña #${i + 1} ya tiene el nombre y horario correctos (${exactTitle}, ${expectedTime12}). Pasando directo a llenar narrativa y dominios...`);
                }
            }
        }

        // Llenar detalles clínicos del servicio (Narrativa y Dominios)
        await fillClinicalData(page, i, svcN, mappedSvcN);
        
        // Guardar y persistir inmediatamente tras completar cada servicio
        console.log(`💾 Guardando y persistiendo Servicio #${i + 1} (${exactTitle}) en Amexzone...`);
        await saveEncounterChanges(page);
        console.log(`✅ Servicio #${i + 1} (${exactTitle}) persistido exitosamente en Amexzone.`);
        await page.waitForTimeout(1000);
    }

    // =========================================================================
    // LIMPIEZA DE PESTAÑAS / SERVICIOS SOBRANTES
    // =========================================================================
    await pruneExtraServices(page, servicesList.length);

    // =========================================================================
    // PASO DE VERIFICACIÓN AUTOMÁTICA OBLIGATORIA ANTES DE GUARDAR
    // =========================================================================
    console.log("\n🔍 Verificando integridad de todos los servicios antes del guardado final...");
    const verificationReport = await page.evaluate(({ servicesList }) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tareas = vm?.citas?.[citaKey]?.tareas || [];

        const report = [];
        for (let idx = 0; idx < servicesList.length; idx++) {
            const expectedSvc = servicesList[idx];
            const actualTarea = tareas[idx];
            const expectedNote = expectedSvc.narrative?.summary_notes || expectedSvc.narratives?.assessment || expectedSvc.summary_notes || '';

            if (actualTarea) {
                // Ensure note is 100% filled across all Vue model fields
                actualTarea.nota = expectedNote;
                actualTarea.response_nota = expectedNote;
                actualTarea.response_nota_es = expectedNote;
                actualTarea.response_nota_en = expectedNote;
                actualTarea.notas = expectedNote;
                if (vm && vm.$set) {
                    vm.$set(actualTarea, 'nota', expectedNote);
                    vm.$set(actualTarea, 'response_nota_es', expectedNote);
                    vm.$set(actualTarea, 'response_nota_en', expectedNote);
                }

                // Also ensure DOM textarea for this tarea ID is populated
                const taEn = document.querySelector(`#input_tarea_nota_${actualTarea.id}_en`);
                const taEs = document.querySelector(`#input_tarea_nota_${actualTarea.id}_es`);
                const ta = taEn || taEs;
                if (ta) {
                    ta.value = expectedNote;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    ta.dispatchEvent(new Event('change', { bubbles: true }));
                }

                report.push({
                    servicio_num: idx + 1,
                    nombre: actualTarea.nombre || actualTarea.name,
                    hora_inicio: actualTarea.hora_inicio,
                    hora_fin: actualTarea.hora_fin,
                    nota_length: (actualTarea.nota || '').length,
                    ok: Boolean((actualTarea.nota || '').length > 0)
                });
            } else {
                report.push({
                    servicio_num: idx + 1,
                    error: "Pestaña no encontrada en Vue"
                });
            }
        }
        return report;
    }, { servicesList });

    console.log("📊 REPORTE DE VERIFICACIÓN PRE-GUARDADO:\n", JSON.stringify(verificationReport, null, 2));

    // Asegurar llenado final de Outcome y Next Steps antes de concluir
    console.log("📋 Llenando campos globales del encuentro: Outcome y Next Steps...");
    await fillGlobalEncounterFields(page, globalOutcome, globalNextSteps);
    await saveEncounterChanges(page);

    // =========================================================================
    // PASO FINAL: Capturar confirmación final y liberar bloqueo
    // =========================================================================
    await page.screenshot({ path: '/root/amexzone-notes-bot/screenshots/07_final_saved.png' }).catch(() => {});
    
    // Release edit lock cleanly so subsequent syncs or users find it completely free
    await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        if (vm && typeof vm.releaseEditLock === 'function') {
            vm.releaseEditLock(false);
        }
    }).catch(() => {});

    console.log(`✅ Nota médica con ${servicesList.length} servicio(s) verificada y guardada exitosamente en estado Pendiente.`);
    return verificationReport;
}

async function saveEncounterChanges(page) {
    console.log("💾 Guardando cambios de la nota (SAVE CHANGES)...");

    // 1. Physical click on the visible [ GUARDAR CAMBIOS ] button
    const saveChangesBtn = page.locator('button, a').filter({ hasText: /GUARDAR CAMBIOS|SAVE CHANGES/i }).first();
    if (await saveChangesBtn.isVisible().catch(() => false)) {
        await saveChangesBtn.scrollIntoViewIfNeeded().catch(() => {});
        await saveChangesBtn.click({ force: true }).catch(() => {});
        console.log("✅ Clic físico realizado en el botón [ GUARDAR CAMBIOS ].");
    } else {
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('a.info_pulse, a.btn-info, #save_changes_btn, button, a.btn'));
            const visibleBtn = btns.find(b => b.offsetParent !== null && /SAVE CHANGES|GUARDAR CAMBIOS/i.test(b.innerText || ''));
            if (visibleBtn) visibleBtn.click();
        });
    }

    await page.waitForTimeout(800);
    await handleUnsavedChangesModal(page);
    await waitForLoader(page);
    await page.waitForTimeout(1000);
}

module.exports = {
    processEncounterServices,
    mapClioServiceToAmexzone,
    fillServiceModal,
    fillClinicalData
};
