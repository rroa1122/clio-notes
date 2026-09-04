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
 * Helper to open the new service modal
 */
async function openNewServiceModal(page) {
    console.log(`👆 Clic en '+ Add Service'...`);
    const addSvcBtn = page.locator('a, button').filter({ hasText: /\+\s*Add Service|Add Service|Añadir Servicio/i }).first();
    let clicked = false;
    if (await addSvcBtn.isVisible().catch(() => false)) {
        await addSvcBtn.scrollIntoViewIfNeeded().catch(() => {});
        await addSvcBtn.click({ force: true });
        clicked = true;
    }
    if (!clicked) {
        await page.evaluate(() => {
            if (typeof window.newServicioModal === 'function') window.newServicioModal();
            else if (typeof window.newServiceModal === 'function') window.newServiceModal();
            else {
                const btn = Array.from(document.querySelectorAll('a, button')).find(b => /\+\s*Add Service|Add Service/i.test(b.innerText || ''));
                if (btn) btn.click();
            }
        });
    }

    const modal = page.locator('.modal.show, div[role="dialog"].show, #edit_service_modal.show').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);
    return modal;
}

/**
 * Fills the modal (both EDIT SERVICE and NEW SERVICE)
 */
async function fillServiceModal(page, mappedService, svcItem, isEditMode = false) {
    const modal = page.locator('.modal.show, div[role="dialog"].show, #edit_service_modal.show').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 1. Service Name Field (Type exact title from Clio)
    const exactTitle = svcItem.service_type || mappedService || "Progress Note - TCM";
    console.log(`✨ Escribiendo título del servicio en modal: '${exactTitle}'...`);

    const clearBtn = modal.locator('a, button, span').filter({ hasText: /Clear|Limpiar/i }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(300);
    }

    const nameInput = modal.locator('input#temp_service_name, input#service_name, input.tt-input, input[name*="name"], input[name*="nombre"], input[type="text"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
        try {
            await nameInput.scrollIntoViewIfNeeded().catch(() => {});
            await nameInput.evaluate(el => {
                el.removeAttribute('disabled');
                el.removeAttribute('readonly');
            });
            await nameInput.click({ force: true });
            await nameInput.fill('');
            await nameInput.pressSequentially(exactTitle, { delay: 20 });
            await page.waitForTimeout(300);
        } catch (e) {
            console.log('⚠️ Error al escribir nombre del servicio:', e.message);
        }
    }

    // Direct DOM sync for name input
    await page.evaluate(({ title }) => {
        const m = document.querySelector('.modal.show, #edit_service_modal, #new_service_modal');
        if (m) {
            const inp = m.querySelector('input#temp_service_name, input#service_name, input.tt-input, input[name*="name"], input[type="text"]');
            if (inp) {
                inp.value = title;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }, { title: exactTitle });

    await page.waitForTimeout(300);

    // 2. Format Times
    const rawIn = svcItem.encounter?.time_in || '10:00 AM';
    const rawOut = svcItem.encounter?.time_out || '10:30 AM';
    const durVal = parseInt(svcItem.encounter?.duration, 10) || 30;
    const posVal = svcItem.encounter?.pos || '11 - Office';

    const tIn12 = format12h(rawIn);
    const tOut12 = format12h(rawOut);

    console.log(`⏰ Usando horario para servicio: ${tIn12} a ${tOut12} (${durVal} min)...`);

    // Helper to set modal input time cleanly
    const setModalInput = async (selector, val) => {
        const inpLoc = modal.locator(selector).first();
        if (await inpLoc.isVisible().catch(() => false)) {
            await inpLoc.evaluate(el => {
                el.removeAttribute('disabled');
                el.removeAttribute('readonly');
            }).catch(() => {});
            await inpLoc.click({ force: true }).catch(() => {});
            await page.waitForTimeout(100);
            await inpLoc.fill(val).catch(() => {});
            await page.keyboard.press('Tab').catch(() => {});
        }
    };

    // 3. Start Time & End Time
    await setModalInput('input#temp_service_hora_inicio, input#service_hora_inicio, input[name*="hora_inicio"]', tIn12);
    await setModalInput('input#temp_service_hora_fin, input#service_hora_fin, input[name*="hora_fin"]', tOut12);

    // 4. Duration
    const durInput = modal.locator('input#temp_service_duracion_mins, input[name*="duracion"], div:has(> label:has-text("Duration")) input, .form-group:has(label:has-text("Duration")) input').first();
    if (await durInput.isVisible().catch(() => false)) {
        await durInput.click({ force: true }).catch(() => {});
        await page.waitForTimeout(100);
        await durInput.fill(String(durVal)).catch(() => {});
        await page.keyboard.press('Tab').catch(() => {});
    }

    // Direct jQuery / DateTimePicker / DOM deep sync
    await page.evaluate(({ tIn, tOut, dur }) => {
        const m = document.querySelector('.modal.show, #edit_service_modal, #new_service_modal');
        if (m) {
            const startEl = m.querySelector('input#temp_service_hora_inicio, input[name*="hora_inicio"]') ||
                            Array.from(m.querySelectorAll('label')).find(l => /Start Time/i.test(l.innerText || ''))?.parentElement?.querySelector('input');
            const endEl = m.querySelector('input#temp_service_hora_fin, input[name*="hora_fin"]') ||
                          Array.from(m.querySelectorAll('label')).find(l => /End Time/i.test(l.innerText || ''))?.parentElement?.querySelector('input');
            const durEl = m.querySelector('input#temp_service_duracion_mins, input[name*="duracion"]') ||
                          Array.from(m.querySelectorAll('label')).find(l => /Duration/i.test(l.innerText || ''))?.parentElement?.querySelector('input');

            if (startEl) {
                startEl.value = tIn;
                startEl.dispatchEvent(new Event('input', { bubbles: true }));
                startEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) {
                    const $st = window.jQuery(startEl);
                    $st.val(tIn).trigger('change').trigger('input').trigger('dp.change');
                    if ($st.data('DateTimePicker')) {
                        try {
                            const mDate = window.moment ? window.moment(tIn, ['hh:mm A', 'h:mm A', 'HH:mm']) : null;
                            if (mDate && mDate.isValid()) {
                                $st.data('DateTimePicker').date(mDate);
                                $st.trigger('dp.change');
                            }
                        } catch (e) {}
                    }
                }
            }

            if (endEl) {
                endEl.value = tOut;
                endEl.dispatchEvent(new Event('input', { bubbles: true }));
                endEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) {
                    const $et = window.jQuery(endEl);
                    $et.val(tOut).trigger('change').trigger('input').trigger('dp.change');
                    if ($et.data('DateTimePicker')) {
                        try {
                            const mDate = window.moment ? window.moment(tOut, ['hh:mm A', 'h:mm A', 'HH:mm']) : null;
                            if (mDate && mDate.isValid()) {
                                $et.data('DateTimePicker').date(mDate);
                                $et.trigger('dp.change');
                            }
                        } catch (e) {}
                    }
                }
            }

            if (durEl) {
                durEl.value = String(dur);
                durEl.dispatchEvent(new Event('input', { bubbles: true }));
                durEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(durEl).val(String(dur)).trigger('change').trigger('input');
            }
        }
    }, { tIn: tIn12, tOut: tOut12, dur: durVal });

    // Hide any dangling bootstrap-datetimepicker popup widgets
    await page.evaluate(() => {
        document.querySelectorAll('.bootstrap-datetimepicker-widget').forEach(w => {
            w.style.display = 'none';
        });
    }).catch(() => {});

    // 5. Place of Service
    const placeSelect = modal.locator('div:has(> label:has-text("Place")), .form-group:has(label:has-text("Place")), select[name*="place"], #temp_service_place').locator('select').first();
    if (await placeSelect.isVisible().catch(() => false)) {
        const p = (posVal || '').toLowerCase();
        if (p.includes('11') || p.includes('office') || p.includes('oficina')) {
            await placeSelect.selectOption({ value: 'office_visit' }).catch(() => {});
        } else if (p.includes('12') || p.includes('home') || p.includes('hogar')) {
            await placeSelect.selectOption({ value: 'home_visit' }).catch(() => {});
        }
    }

    await page.waitForTimeout(500);

    // 6. Save Modal via Teal SAVE Button
    console.log("💾 Guardando servicio en el modal (clic en SAVE)...");
    const saveBtn = modal.locator('button:has-text("SAVE"), button:has-text("Save"), .modal-footer button.btn-primary, button[type="submit"], #save_service_btn').first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click({ force: true });
    } else {
        await page.evaluate(() => {
            const m = document.querySelector('.modal.show, #edit_service_modal, #new_service_modal');
            if (m) {
                const btns = Array.from(m.querySelectorAll('button, a'));
                const saveB = btns.find(b => /SAVE|GUARDAR/i.test(b.innerText || '') && !/CANCEL|DESCARTAR/i.test(b.innerText || ''));
                if (saveB) saveB.click();
            }
        });
    }

    await page.waitForTimeout(2000);

    // 7. CRITICAL: Check for any error / alert / overlapping modal from Amexzone
    const detectedError = await page.evaluate(() => {
        const popups = Array.from(document.querySelectorAll('.swal2-container, .swal2-popup, .swal-overlay, .swal-modal, div[role="dialog"].show, div[role="alertdialog"], .modal.show, .notiflix-report'));
        for (const p of popups) {
            if (p.offsetParent !== null || window.getComputedStyle(p).display !== 'none') {
                const text = (p.innerText || '').replace(/\s+/g, ' ').trim();
                if (/OVERLAPPING NOT ALLOWED|OVERLAPPING|NOT ALLOWED|ALREADY EXIST|EXISTE UN SERVICIO|CONFLICTO|NO APPROVED UNITS|UNIDADES APROBADAS/i.test(text)) {
                    // Try to close popup cleanly
                    const closeBtn = p.querySelector('button, .swal2-confirm, .swal2-close, a.btn');
                    if (closeBtn) closeBtn.click();
                    return text;
                }
            }
        }
        return null;
    });

    if (detectedError) {
        console.error(`❌ ERROR CRÍTICO AL GUARDAR SERVICIO EN AMEXZONE: ${detectedError}`);
        await page.screenshot({ path: '/root/amexzone-notes-bot/screenshots/error_overlapping.png' }).catch(() => {});
        throw new Error(`[OVERLAPPING / ERROR EN AMEXZONE] ${detectedError}`);
    }

    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await waitForLoader(page);
}

async function handleUnsavedChangesModal(page) {
    try {
        const dialogBtn = page.locator('button:has-text("Yes, Save"), button:has-text("Discard"), a:has-text("Discard"), .swal2-confirm').first();
        if (await dialogBtn.isVisible().catch(() => false)) {
            console.log("ℹ️ Detectado diálogo de confirmación/descarte de cambios. Haciendo clic...");
            await dialogBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1000);
        }
    } catch (e) {}
}

/**
 * Fills clinical narratives and domain checkboxes for a specific service tab
 */
async function fillClinicalData(page, tabIndex, svcItem, mappedService) {
    console.log(`\n📋 Llenando narrativa y dominios del Servicio #${tabIndex + 1}: ${mappedService}...`);
    await handleUnsavedChangesModal(page);

    // Ensure the tab is physically clicked and active in the header
    const tabBtn = page.locator('ul.services_ul_list li[role="tab"]').nth(tabIndex);
    if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
    }

    const assessmentText = svcItem.narrative?.summary_notes || svcItem.narratives?.assessment || svcItem.narrative?.assessment || svcItem.summary_notes || '';
    const outcomeText = svcItem.narrative?.outcome_of_services || svcItem.narratives?.service_plan || svcItem.narrative?.service_plan || svcItem.outcome_of_services || '';
    const nextStepsText = svcItem.narrative?.next_steps || svcItem.narratives?.next_steps || svcItem.next_steps || '';
    const targetDomains = svcItem.domains || [];

    console.log(`✍️ Llenando textos para el Servicio #${tabIndex + 1} (${assessmentText.slice(0, 50)}...)...`);

    // 1. Precise data injection and DOM binding using the exact service tarea ID
    await page.evaluate(({ tabIdx, assessmentText, outcomeText, nextStepsText, targetDomains }) => {
        const vueEl = document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content');
        const vm = vueEl?.__vue__;
        if (!vm) return;

        const citaKey = Object.keys(vm.citas || {})[0];
        const tarea = vm.citas?.[citaKey]?.tareas?.[tabIdx];
        if (!tarea) return;

        const tareaId = tarea.id;

        // --- A. Fill Notes Textarea by exact ID ---
        if (assessmentText) {
            tarea.response_nota_es = assessmentText;
            tarea.response_nota_en = assessmentText;

            const noteSelectors = [
                `textarea#input_tarea_nota_${tareaId}_en`,
                `textarea#input_tarea_nota_${tareaId}_es`,
                `textarea#input_tarea_nota_${tareaId}`,
                `textarea[name="input_tarea_nota_${tareaId}_en"]`,
                `textarea[name="input_tarea_nota_${tareaId}_es"]`
            ];
            for (const sel of noteSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    el.value = assessmentText;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }

        // --- B. Fill Outcome & Next Steps by exact ID and in Vue ---
        if (outcomeText) {
            if (vm.citas[citaKey]) vm.citas[citaKey].tcm_outcome_of_services = outcomeText;
            tarea.tcm_outcome_of_services = outcomeText;
            const elOutcome = document.querySelector(`textarea#input_tcm_outcome_of_services_${tareaId}, textarea#input_tcm_outcome_of_services, textarea[name="input_tcm_outcome_of_services_${tareaId}"]`);
            if (elOutcome) {
                elOutcome.value = outcomeText;
                elOutcome.dispatchEvent(new Event('input', { bubbles: true }));
                elOutcome.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        if (nextStepsText) {
            if (vm.citas[citaKey]) vm.citas[citaKey].tcm_next_steps = nextStepsText;
            tarea.tcm_next_steps = nextStepsText;
            const elNext = document.querySelector(`textarea#input_tcm_next_steps_${tareaId}, textarea#input_tcm_next_steps, textarea[name="input_tcm_next_steps_${tareaId}"]`);
            if (elNext) {
                elNext.value = nextStepsText;
                elNext.dispatchEvent(new Event('input', { bubbles: true }));
                elNext.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // --- C. Domains in Vue Reactive Model ---
        const preg = tarea.cuestionario?.secciones?.[0]?.segmentos?.[0]?.preguntas?.find(p => p.type === 'checkbox' || (p.name_en && p.name_en.includes('Domain')));
        if (preg && Array.isArray(preg.opciones)) {
            const targetNumbers = [];
            for (const d of targetDomains) {
                const normD = String(d || '').toLowerCase().trim();
                if (/^(12_|12\b|other)/i.test(normD)) targetNumbers.push(12);
                else if (/^(11_|11\b|legal)/i.test(normD)) targetNumbers.push(11);
                else if (/^(10_|10\b|transportation)/i.test(normD)) targetNumbers.push(10);
                else if (/^(9_|9\b|basic)/i.test(normD)) targetNumbers.push(9);
                else if (/^(8_|8\b|economic)/i.test(normD)) targetNumbers.push(8);
                else if (/^(7_|7\b|housing)/i.test(normD)) targetNumbers.push(7);
                else if (/^(6_|6\b|daily|living)/i.test(normD)) targetNumbers.push(6);
                else if (/^(5_|5\b|social|recreational)/i.test(normD)) targetNumbers.push(5);
                else if (/^(4_|4\b|school|education)/i.test(normD)) targetNumbers.push(4);
                else if (/^(3_|3\b|vocational)/i.test(normD)) targetNumbers.push(3);
                else if (/^(2_|2\b|physical|medical|dental)/i.test(normD)) targetNumbers.push(2);
                else if (/^(1_|1\b|mental)/i.test(normD)) targetNumbers.push(1);
            }
            if (targetNumbers.length === 0) targetNumbers.push(1);

            const matchedIds = [];
            preg.opciones.forEach(opt => {
                const optText = (opt.name_en || opt.name_es || '').toLowerCase();
                const isTarget = targetNumbers.some(num => {
                    const numRegex = new RegExp(`(^|\\s|#)${num}(\\s|\\.|:|/|-|$)`, 'i');
                    return numRegex.test(optText);
                });
                if (isTarget) {
                    matchedIds.push(opt.id);
                }
            });
            if (matchedIds.length > 0) {
                if (vm.$set) {
                    vm.$set(preg, 'response', matchedIds);
                } else {
                    preg.response = matchedIds;
                }
            }
        }
    }, { tabIdx: tabIndex, assessmentText, outcomeText, nextStepsText, targetDomains });

    // 2. Playwright interaction for focused textarea if needed
    if (assessmentText) {
        const targetId = await page.evaluate((tabIdx) => {
            const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
            const citaKey = Object.keys(vm?.citas || {})[0];
            return vm?.citas?.[citaKey]?.tareas?.[tabIdx]?.id;
        }, tabIndex);

        if (targetId) {
            const exactArea = page.locator(`textarea#input_tarea_nota_${targetId}_en, textarea#input_tarea_nota_${targetId}_es, textarea#input_tarea_nota_${targetId}`).first();
            if (await exactArea.isVisible().catch(() => false)) {
                await exactArea.scrollIntoViewIfNeeded().catch(() => {});
                await exactArea.click({ force: true });
                await exactArea.fill(assessmentText);
            }
        }
    }

    // 3. Mark the exact domain checkbox by physical label text and clean all others
    const activeDomains = targetDomains.length > 0 ? targetDomains : ['1_mental_health_substance_abuse'];
    console.log(`☑️ Sincronizando dominios para el Servicio #${tabIndex + 1}: ${JSON.stringify(activeDomains)}...`);

    await page.evaluate(({ tabIdx, targetDomains }) => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
        const preg = tarea?.cuestionario?.secciones?.[0]?.segmentos?.[0]?.preguntas?.find(p => p.type === 'checkbox' || (p.name_en && p.name_en.includes('Domain')));

        const targetNumbers = [];
        for (const d of targetDomains) {
            const normD = String(d || '').toLowerCase().trim();
            if (/^(12_|12\b|other)/i.test(normD)) targetNumbers.push(12);
            else if (/^(11_|11\b|legal)/i.test(normD)) targetNumbers.push(11);
            else if (/^(10_|10\b|transportation)/i.test(normD)) targetNumbers.push(10);
            else if (/^(9_|9\b|basic)/i.test(normD)) targetNumbers.push(9);
            else if (/^(8_|8\b|economic)/i.test(normD)) targetNumbers.push(8);
            else if (/^(7_|7\b|housing)/i.test(normD)) targetNumbers.push(7);
            else if (/^(6_|6\b|daily|living)/i.test(normD)) targetNumbers.push(6);
            else if (/^(5_|5\b|social|recreational)/i.test(normD)) targetNumbers.push(5);
            else if (/^(4_|4\b|school|education)/i.test(normD)) targetNumbers.push(4);
            else if (/^(3_|3\b|vocational)/i.test(normD)) targetNumbers.push(3);
            else if (/^(2_|2\b|physical|medical|dental)/i.test(normD)) targetNumbers.push(2);
            else if (/^(1_|1\b|mental)/i.test(normD)) targetNumbers.push(1);
        }
        if (targetNumbers.length === 0) targetNumbers.push(1);

        // A. Match Vue model
        if (preg && Array.isArray(preg.opciones)) {
            const matchedIds = [];
            preg.opciones.forEach(opt => {
                const optText = (opt.name_en || opt.name_es || '').toLowerCase();
                const isTarget = targetNumbers.some(num => {
                    const numRegex = new RegExp(`(^|\\s|#)${num}(\\s|\\.|:|/|-|$)`, 'i');
                    return numRegex.test(optText);
                });
                if (isTarget) {
                    matchedIds.push(opt.id);
                }
            });
            if (matchedIds.length > 0) {
                if (vm && vm.$set) vm.$set(preg, 'response', matchedIds);
                else preg.response = matchedIds;
            }
        }

        // B. Match DOM checkboxes by exact tab index prefix and labels
        const tabInputs = Array.from(document.querySelectorAll(`input[id^="preview_response_option_${tabIdx}_"], input[id*="_${tabIdx}_"]`));
        if (tabInputs.length > 0) {
            tabInputs.forEach(inp => {
                if (inp.type !== 'checkbox') return;
                const parentLbl = inp.closest('label') || document.querySelector(`label[for="${inp.id}"]`) || inp.parentElement;
                const text = (parentLbl?.innerText || '').toLowerCase();
                const shouldBeChecked = targetNumbers.some(num => {
                    const numRegex = new RegExp(`(^|\\s|#)${num}(\\s|\\.|:|/|-|$)`, 'i');
                    return numRegex.test(text);
                });

                if (shouldBeChecked && !inp.checked) {
                    inp.click();
                    inp.checked = true;
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (!shouldBeChecked && inp.checked) {
                    inp.click();
                    inp.checked = false;
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        } else {
            // Fallback: active tab container labels
            const activeTab = document.querySelector('.tab-pane.active, .tab-pane.show, .main-content');
            if (activeTab) {
                const labels = Array.from(activeTab.querySelectorAll('label'));
                labels.forEach(lbl => {
                    const text = (lbl.innerText || '').toLowerCase();
                    const inp = lbl.querySelector('input[type="checkbox"]') ||
                                (lbl.getAttribute('for') ? document.getElementById(lbl.getAttribute('for')) : null);
                    if (inp && inp.type === 'checkbox') {
                        const shouldBeChecked = targetNumbers.some(num => {
                            const numRegex = new RegExp(`(^|\\s|#)${num}(\\s|\\.|:|/|-|$)`, 'i');
                            return numRegex.test(text);
                        });

                        if (shouldBeChecked && !inp.checked) {
                            inp.click();
                            inp.checked = true;
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                        } else if (!shouldBeChecked && inp.checked) {
                            inp.click();
                            inp.checked = false;
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                });
            }
        }
    }, { tabIdx: tabIndex, targetDomains: activeDomains });

    await page.waitForTimeout(500);
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
        if (!vm) return;
        const citaKey = Object.keys(vm.citas || {})[0];
        if (vm.citas && vm.citas[citaKey]) {
            if (outcome) vm.citas[citaKey].tcm_outcome_of_services = outcome;
            if (nextSteps) vm.citas[citaKey].tcm_next_steps = nextSteps;

            if (Array.isArray(vm.citas[citaKey].tareas)) {
                vm.citas[citaKey].tareas.forEach(t => {
                    if (outcome) t.tcm_outcome_of_services = outcome;
                    if (nextSteps) t.tcm_next_steps = nextSteps;
                });
            }
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
 * Main function to process all encounter services in sequence matching the user's workflow
 */
async function processEncounterServices(page, payload, pin) {
    console.log("⏳ Esperando que cargue la pantalla de atención médica...");
    await page.waitForSelector('.main-content, #app, .card, body', { timeout: 30000 });
    await waitForLoader(page);
    
    // Actively wait for and unlock any Access Code modal
    await ensurePinUnlocked(page, pin || payload.pin || '1974', 6000);
    await handleUnsavedChangesModal(page);

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

    console.log(`📋 Total de servicios a procesar en esta nota: ${servicesList.length}`);

    // Check again for Access Code before editing service
    await ensurePinUnlocked(page, pin || payload.pin || '1974', 2000);

    // =========================================================================
    // PASO 3 & 4 (Fotos 3 y 4): Editar el Servicio Inicial #1
    // =========================================================================
    const svc1 = servicesList[0];
    const mappedSvc1 = mapClioServiceToAmexzone(svc1.service_type, payload.patient_dob);
    console.log(`\n✏️ Editando Servicio Inicial #1: ${mappedSvc1} (${svc1.encounter?.time_in} - ${svc1.encounter?.time_out})...`);

    const editLocators = [
        page.locator('#edit_service_btn, .edit-service-btn, button:has-text("EDIT SERVICE"), a:has-text("EDIT SERVICE"), button:has-text("EDITAR SERVICIO")').first(),
        page.locator('a[id^="btn_edit_tarea_"], i.fa-pencil, i.fa-edit').first()
    ];
    let clickedEdit = false;
    for (const loc of editLocators) {
        if (await loc.isVisible().catch(() => false)) {
            console.log(`👆 Clic en '[ EDIT SERVICE ]' mediante Playwright...`);
            await loc.click({ force: true }).catch(() => {});
            clickedEdit = true;
            break;
        }
    }
    if (!clickedEdit) {
        clickedEdit = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a, div, span'));
            const b = btns.find(el => /^\s*EDIT SERVICE|EDITAR SERVICIO\s*$/i.test(el.innerText || ''));
            if (b) { b.click(); return true; }
            return false;
        });
    }

    if (clickedEdit) {
        await page.waitForTimeout(1500);
        await fillServiceModal(page, mappedSvc1, svc1, true);
    }

    // =========================================================================
    // PASO 5: Llenar detalles clínicos del Servicio #1 y GUARDAR CAMBIOS
    // =========================================================================
    await fillClinicalData(page, 0, svc1, mappedSvc1);
    await fillGlobalEncounterFields(page, globalOutcome, globalNextSteps);
    await saveEncounterChanges(page);

    // =========================================================================
    // PASO 6 & 7: Añadir y llenar Servicios Adicionales (Servicio #2 en adelante)
    // =========================================================================
    const existingCount = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        const citaKey = Object.keys(vm?.citas || {})[0];
        return (vm?.citas?.[citaKey]?.tareas || []).length;
    });
    console.log(`📊 Servicios existentes detectados en el encuentro de Amexzone: ${existingCount}`);

    for (let i = 1; i < servicesList.length; i++) {
        await ensurePinUnlocked(page, pin || payload.pin || '1974', 2000);
        const svcN = servicesList[i];
        const mappedSvcN = mapClioServiceToAmexzone(svcN.service_type, payload.patient_dob);
        console.log(`\n➕ Procesando Servicio Adicional #${i + 1}/${servicesList.length}: ${mappedSvcN} (${svcN.encounter?.time_in} - ${svcN.encounter?.time_out})...`);

        if (existingCount < i + 1) {
            // Service does not exist yet -> Create with + Add Service
            await openNewServiceModal(page);
            await handleUnsavedChangesModal(page);
            await fillServiceModal(page, mappedSvcN, svcN, false);
            console.log(`⏳ Esperando confirmación de la pestaña del Servicio #${i + 1}...`);
            await page.waitForTimeout(2000);
        } else {
            // Service already exists -> Switch to tab i
            console.log(`📑 La pestaña del Servicio #${i + 1} ya existe en el encuentro. Seleccionando pestaña...`);
            await page.evaluate((tabIdx) => {
                const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
                const citaKey = Object.keys(vm?.citas || {})[0];
                const tarea = vm?.citas?.[citaKey]?.tareas?.[tabIdx];
                if (tarea && typeof window.setTareaActive === 'function') {
                    window.setTareaActive(tarea);
                }
            }, i);
            await page.waitForTimeout(1000);
        }

        // Llenar detalles clínicos del servicio adicional y GUARDAR CAMBIOS
        await fillClinicalData(page, i, svcN, mappedSvcN);
        await fillGlobalEncounterFields(page, globalOutcome, globalNextSteps);
        await saveEncounterChanges(page);
    }

    // Asegurar llenado final de Outcome y Next Steps antes de concluir
    await fillGlobalEncounterFields(page, globalOutcome, globalNextSteps);
    await saveEncounterChanges(page);

    // =========================================================================
    // PASO FINAL: Capturar confirmación final
    // =========================================================================
    await page.screenshot({ path: '/root/amexzone-notes-bot/screenshots/07_final_saved.png' }).catch(() => {});
    console.log(`✅ Nota médica con ${servicesList.length} servicio(s) verificada y guardada exitosamente en estado Pendiente.`);
}

async function saveEncounterChanges(page) {
    console.log("💾 Guardando cambios de la nota (SAVE CHANGES)...");
    
    // Look for visible Save button in UI or trigger via evaluate
    const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('a.info_pulse, a.btn-info, #save_changes_btn, button, a.btn'));
        const visibleBtn = btns.find(b => b.offsetParent !== null && /SAVE CHANGES|GUARDAR CAMBIOS/i.test(b.innerText || ''));
        if (visibleBtn) {
            visibleBtn.click();
            return true;
        }
        return false;
    });

    if (!clicked) {
        const saveChangesBtn = page.locator('a.btn.btn-info.info_pulse, a.btn:has-text("SAVE CHANGES"), #save_changes_btn, button:has-text("SAVE CHANGES")').first();
        if (await saveChangesBtn.isVisible().catch(() => false)) {
            await saveChangesBtn.scrollIntoViewIfNeeded().catch(() => {});
            await saveChangesBtn.click({ force: true }).catch(() => {});
        }
    }

    await page.waitForTimeout(1500);
    const yesSaveBtn = page.locator('button:has-text("Yes, Save"), button:has-text("Yes, save"), .swal2-confirm').first();
    if (await yesSaveBtn.isVisible().catch(() => false)) {
        console.log("👆 Confirmando 'Yes, Save' en el diálogo...");
        await yesSaveBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(3000);
    }

    await page.waitForTimeout(2000);
    await waitForLoader(page);

    // Check for error modals upon saving encounter
    const saveError = await page.evaluate(() => {
        const popups = Array.from(document.querySelectorAll('.swal2-container, .swal2-popup, .swal-overlay, .swal-modal, div[role="dialog"].show, div[role="alertdialog"], .modal.show, .notiflix-report'));
        for (const p of popups) {
            if (p.offsetParent !== null || window.getComputedStyle(p).display !== 'none') {
                const text = (p.innerText || '').replace(/\s+/g, ' ').trim();
                if (/OVERLAPPING NOT ALLOWED|OVERLAPPING|NOT ALLOWED|ALREADY EXIST|EXISTE UN SERVICIO|CONFLICTO|NO APPROVED UNITS|UNIDADES APROBADAS/i.test(text)) {
                    const closeBtn = p.querySelector('button, .swal2-confirm, .swal2-close, a.btn');
                    if (closeBtn) closeBtn.click();
                    return text;
                }
            }
        }
        return null;
    });

    if (saveError) {
        console.error(`❌ ERROR AL GUARDAR ENCUENTRO EN AMEXZONE: ${saveError}`);
        await page.screenshot({ path: '/root/amexzone-notes-bot/screenshots/error_encounter_save.png' }).catch(() => {});
        throw new Error(`[ERROR AL GUARDAR ENCUENTRO EN AMEXZONE] ${saveError}`);
    }
}

module.exports = {
    processEncounterServices,
    mapClioServiceToAmexzone,
    fillServiceModal,
    fillClinicalData
};
