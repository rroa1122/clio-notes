const { waitForLoader } = require('../core/browser');
const { handlePin } = require('../core/sessionManager');

const generateDateVariants = (rawDateStr) => {
    if (!rawDateStr) return [];
    let dateObj = null;
    if (typeof rawDateStr === 'string' && rawDateStr.includes('-')) {
        const [y, m, d] = rawDateStr.split('-');
        dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    } else {
        dateObj = new Date(rawDateStr);
    }
    if (!dateObj || isNaN(dateObj.getTime())) return [String(rawDateStr)];

    const monthsEng = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthsSpa = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthsEngShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsSpaShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const y = dateObj.getFullYear();
    const mIdx = dateObj.getMonth();
    const d = dateObj.getDate();
    const mm = String(mIdx + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');

    return Array.from(new Set([
        `${monthsEng[mIdx]} ${d}, ${y}`,
        `${monthsSpa[mIdx]} ${d}, ${y}`,
        `${monthsEngShort[mIdx]} ${d}, ${y}`,
        `${monthsSpaShort[mIdx]} ${d}, ${y}`,
        `${monthsEngShort[mIdx]} ${d}`,
        `${monthsSpaShort[mIdx]} ${d}`,
        `${d} de ${monthsSpa[mIdx].toLowerCase()} de ${y}`,
        `${dd} de ${monthsSpa[mIdx].toLowerCase()} de ${y}`,
        `${d} de ${monthsSpa[mIdx].toLowerCase()}`,
        `${dd} de ${monthsSpa[mIdx].toLowerCase()}`,
        `${mm}/${dd}/${y}`,
        `${mIdx + 1}/${d}/${y}`,
        `${dd}/${mm}/${y}`,
        `${d}/${mIdx + 1}/${y}`,
        `${y}-${mm}-${dd}`,
        String(rawDateStr)
    ]));
};

const ensureCitasTab = async (page) => {
    try {
        console.log("📑 Asegurando pestaña 'Citas y Encuentros' / 'Appointments and Encounters' activa en el perfil del paciente...");
        
        const clicked = await page.evaluate(() => {
            const appSection = document.querySelector('#appointments, #section_appointments');
            if (appSection && appSection.offsetParent !== null) {
                return true;
            }

            if (typeof vuem !== 'undefined') {
                if (vuem.setSection) { vuem.setSection('appointments'); return true; }
                if (vuem.changeSection) { vuem.changeSection('appointments'); return true; }
            }

            const sidebarLinks = Array.from(document.querySelectorAll('a.section-list, .sidebar a, .nav-sidebar a, #patient_sidebar a, .patient-menu a, a[data-section]'));
            const targetLink = sidebarLinks.find(el => {
                const sec = (el.getAttribute('data-section') || '').toLowerCase();
                const text = (el.innerText || '').toLowerCase();
                return sec.includes('appointment') || sec.includes('cita') || text.includes('appointments and encounters') || text.includes('citas y encuentros');
            });

            if (targetLink) {
                targetLink.click();
                if (window.jQuery) window.jQuery(targetLink).trigger('click');
                return true;
            }

            const anyLink = Array.from(document.querySelectorAll('a, button, li')).find(el => {
                if (el.closest('.navbar, header, nav.navbar, #main_navbar')) return false;
                const text = (el.innerText || '').toLowerCase();
                return text.includes('appointments and encounters') || text.includes('citas y encuentros');
            });

            if (anyLink) {
                anyLink.click();
                if (window.jQuery) window.jQuery(anyLink).trigger('click');
                return true;
            }

            return false;
        });

        if (!clicked) {
            const citasSectionBtn = page.locator('a.section-list[data-section="appointments"], a.section-list:has-text("Appointments and Encounters"), a.section-list:has-text("Citas y Encuentros")').first();
            if (await citasSectionBtn.isVisible().catch(() => false)) {
                await citasSectionBtn.click({ force: true }).catch(() => {});
            }
        }

        await page.waitForTimeout(3000);
        await waitForLoader(page);
    } catch (e) {}
};

const parseTimeToMinutes = (tStr) => {
    if (!tStr) return 0;
    const clean = tStr.replace(/am|pm/i, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1] || '0', 10);
    if (/pm/i.test(tStr) && h < 12) h += 12;
    if (/am/i.test(tStr) && h === 12) h = 0;
    return h * 60 + m;
};

const formatMinutesTo12h = (totalMins) => {
    let h = Math.floor(totalMins / 60) % 24;
    let m = totalMins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

const calculateNextAvailableSlot = (occupiedRanges, durationMins = 15, preferredStartStr = '10:00 AM') => {
    const dur = parseInt(durationMins, 10) || 15;
    const workStart = 8 * 60; // 08:00 AM
    const workEnd = 18 * 60; // 06:00 PM
    
    const busy = (occupiedRanges || []).map(r => ({
        start: parseTimeToMinutes(r.start),
        end: parseTimeToMinutes(r.end)
    })).sort((a, b) => a.start - b.start);
    
    const prefStart = parseTimeToMinutes(preferredStartStr);
    
    let candidates = [prefStart];
    for (const b of busy) {
        const nextSlot = Math.ceil(b.end / 15) * 15;
        candidates.push(nextSlot);
    }
    candidates = Array.from(new Set(candidates)).sort((a, b) => a - b);
    
    for (const cand of candidates) {
        if (cand < workStart || cand + dur > workEnd) continue;
        const hasOverlap = busy.some(b => !(cand + dur <= b.start || cand >= b.end));
        if (!hasOverlap) {
            return formatMinutesTo12h(cand);
        }
    }
    
    return '11:00 AM';
};

const findExistingAppointment = async (page, visitDate) => {
    await ensureCitasTab(page);
    await page.waitForTimeout(2000);
    const searchDates = generateDateVariants(visitDate);
    
    // 1. Direct locator match
    for (const pDate of searchDates) {
        const row = page.locator('table tbody tr, .list-group-item')
            .filter({ hasText: pDate })
            .first();
        if (await row.isVisible().catch(() => false)) {
            return row;
        }
    }
    
    // 2. Fuzzy text match across table rows
    const rowIndex = await page.evaluate((dateList) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr, .list-group-item'));
        for (let i = 0; i < rows.length; i++) {
            const text = rows[i].innerText.toLowerCase();
            for (const d of dateList) {
                if (text.includes(d.toLowerCase())) {
                    return i;
                }
            }
        }
        return -1;
    }, searchDates);

    if (rowIndex >= 0) {
        return page.locator('table tbody tr, .list-group-item').nth(rowIndex);
    }

    return null;
};

const createNewAppointment = async (page, patientEmrId, patientName, visitDate, pin, payload = {}, forceNonBillable = false) => {
    console.log("➕ Creando Nueva Cita...");
    await waitForLoader(page);

    // Read existing occupied slots from table for smart conflict resolution
    const occupiedRanges = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr, .list-group-item'));
        const ranges = [];
        rows.forEach(r => {
            const text = r.innerText;
            const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(?:-|a|to)\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (m) {
                ranges.push({ start: m[1].trim(), end: m[2].trim() });
            }
        });
        return ranges;
    }).catch(() => []);

    await page.evaluate(() => {
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    // Format date values
    let dateObj = null;
    if (visitDate && typeof visitDate === 'string' && visitDate.includes('-')) {
        const [y, m, d] = visitDate.split('-');
        dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    } else {
        dateObj = new Date(visitDate);
    }
    const y = dateObj && !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026;
    const mm = dateObj && !isNaN(dateObj.getTime()) ? String(dateObj.getMonth() + 1).padStart(2, '0') : '08';
    const dd = dateObj && !isNaN(dateObj.getTime()) ? String(dateObj.getDate()).padStart(2, '0') : '04';
    
    const isoDate = `${y}-${mm}-${dd}`;
    const usDate = `${mm}/${dd}/${y}`;
    const latamDate = `${dd}/${mm}/${y}`;

    console.log(`📅 Abriendo modal de Nueva Cita para la fecha: ${usDate} (${isoDate})...`);
    
    const firstSvc = (payload?.services && payload.services.length > 0) ? payload.services[0] : payload;
    const timeInRaw = firstSvc?.encounter?.time_in || payload?.encounter?.time_in || '10:00 AM';
    const timeOutRaw = firstSvc?.encounter?.time_out || payload?.encounter?.time_out || '10:15 AM';
    const durationMins = parseInt(firstSvc?.encounter?.duration || payload?.encounter?.duration || 15, 10);
    const posStr = firstSvc?.encounter?.pos || payload?.encounter?.pos || '12 - Home';

    const formatTo24h = (tStr) => {
        if (!tStr) return '10:00:00';
        const clean = tStr.replace(/am|pm/i, '').trim();
        const parts = clean.split(':');
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1] || '0', 10);
        if (/pm/i.test(tStr) && h < 12) h += 12;
        if (/am/i.test(tStr) && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };
    const timeIn24h = formatTo24h(timeInRaw);

    console.log(`⏰ Horario configurado de Clio: ${timeInRaw} (${timeIn24h}), Duración: ${durationMins} min, POS: ${posStr}`);

    // Remove any interfering overlays like OneSignal or notification popups
    await page.evaluate(() => {
        const despuesBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && b.innerText.includes('Después'));
        if (despuesBtn) despuesBtn.click();
        document.querySelectorAll('#onesignal-slidedown-container, .onesignal-slidedown-container, .onesignal-reset, #onesignal-slidedown-dialog').forEach(el => el.remove());
    }).catch(() => {});

    // 1. Enter Citas y Encuentros tab first
    await ensureCitasTab(page);
    await page.waitForTimeout(1000);

    // 1.1 Check if an appointment already exists for this visit date
    const monthNamesSpa = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthNamesEng = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const dNum = parseInt(dd, 10);
    const mIdx = parseInt(mm, 10) - 1;
    const yNum = parseInt(y, 10);

    const existingAppointment = await page.evaluate(({ dNum, mIdx, yNum, monthNamesSpa, monthNamesEng, isoDate }) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        
        const mSpa = monthNamesSpa[mIdx];
        const mSpaShort = mSpa.slice(0, 3);
        const mEng = monthNamesEng[mIdx];
        const mEngShort = mEng.slice(0, 3);

        // Strict day match regex: ensures day number has boundary (^|[^0-9]) and ($|[^0-9])
        const spaRegex = new RegExp(`(^|[^0-9])${dNum}\\s+de\\s+(${mSpa}|${mSpaShort})(\\s+de\\s+${yNum})?([^0-9]|$)`, 'i');
        const engRegex = new RegExp(`(^|[^0-9])(${mEng}|${mEngShort})\\s+${dNum}(,?\\s+${yNum})?([^0-9]|$)`, 'i');
        const isoRegex = new RegExp(`(^|[^0-9])${isoDate}([^0-9]|$)`);

        for (const row of rows) {
            const text = (row.innerText || '').toLowerCase();
            const dateMatch = spaRegex.test(text) || engRegex.test(text) || isoRegex.test(text);
            const statusMatch = /pendiente|pending/i.test(text);
            const isTcm = /progress note|tcm/i.test(text);
            if (dateMatch && (statusMatch || isTcm)) {
                const link = row.querySelector('a[href*="/attend/appointment/"], a[href*="/encounter/"]');
                if (link && link.href) {
                    return { found: true, url: link.href };
                }
                const clickable = row.querySelector('a, button, span');
                if (clickable) {
                    clickable.click();
                    return { found: true, clicked: true };
                }
            }
        }
        return { found: false };
    }, { dNum, mIdx, yNum, monthNamesSpa, monthNamesEng, isoDate });

    if (existingAppointment && existingAppointment.found) {
        console.log(`🎯 Cita existente detectada en la tabla para el ${dNum} de ${monthNamesSpa[mIdx]} de ${yNum}. Entrando directamente a gestionar la cita...`);
        if (existingAppointment.url) {
            await page.goto(existingAppointment.url, { waitUntil: 'domcontentloaded' });
            await waitForLoader(page);
            return;
        }
        await waitForLoader(page);
        return;
    }

    // 2. Open modal cleanly via DOM button click or fallback
    console.log(`➕ Abriendo modal de Nueva Cita con paciente ${patientName} (${patientEmrId})...`);
    await page.evaluate(({ pId, pName, targetDate, tIn }) => {
        try {
            const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && /Nueva Cita|New Appointment|\+ New Appointment/i.test(b.innerText));
            if (btn) {
                btn.click();
                return;
            }
            if (typeof openNewCita === 'function') {
                openNewCita(
                    { id: String(pId), nombre_apellidos: pName },
                    '473',
                    null,
                    targetDate,
                    tIn,
                    'tcm'
                );
                return;
            }
            if (typeof vuem !== 'undefined' && typeof vuem.openNewCitaPaciente === 'function') {
                vuem.openNewCitaPaciente();
            }
        } catch (e) {
            const anyBtn = document.querySelector('button[onclick*="Cita"], a[onclick*="Cita"]');
            if (anyBtn) anyBtn.click();
        }
    }, { pId: patientEmrId, pName: patientName, targetDate: isoDate, tIn: timeIn24h });
    await page.waitForTimeout(2500);

    // 3. Select date via interactive calendar clicks
    console.log(`📅 Abriendo y seleccionando fecha en el calendario para ${visitDate}...`);
    try {
        // Open datepicker popup
        const dateInput = page.locator('#cita_fecha_hora, input[name="cita_fecha_hora"]').first();
        if (await dateInput.isVisible().catch(() => false)) {
            await dateInput.click({ force: true });
            await page.waitForTimeout(1000);

            // Month navigation (bilingual support: English & Spanish)
            const monthNamesSpa = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            const fullMonthNamesSpa = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const monthNamesEng = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const fullMonthNamesEng = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            
            const targetMonthIdx = parseInt(mm, 10) - 1;
            const targetYear = parseInt(y, 10);
            const targetDay = parseInt(dd, 10);

            for (let i = 0; i < 24; i++) {
                const headerText = await page.evaluate(() => {
                    const h = document.querySelector('.daterangepicker:not([style*="display: none"]) th.month, .datepicker:not([style*="display: none"]) .datepicker-switch, th.month');
                    return h ? h.innerText.toLowerCase() : '';
                });

                const matchesMonth = 
                    headerText.includes(monthNamesSpa[targetMonthIdx]) || 
                    headerText.includes(fullMonthNamesSpa[targetMonthIdx]) ||
                    headerText.includes(monthNamesEng[targetMonthIdx]) ||
                    headerText.includes(fullMonthNamesEng[targetMonthIdx]);

                const matchesYear = headerText.includes(String(targetYear));

                if (matchesMonth && matchesYear) {
                    console.log(`🎯 Mes y año alcanzados en calendario: ${headerText}`);
                    break;
                }

                const prevBtn = page.locator('.daterangepicker:visible th.prev, .datepicker:visible .prev, th.prev').first();
                const nextBtn = page.locator('.daterangepicker:visible th.next, .datepicker:visible .next, th.next').first();

                let currentMonthIdx = monthNamesEng.findIndex(m => headerText.includes(m));
                if (currentMonthIdx === -1) currentMonthIdx = fullMonthNamesEng.findIndex(m => headerText.includes(m));
                if (currentMonthIdx === -1) currentMonthIdx = monthNamesSpa.findIndex(m => headerText.includes(m));
                if (currentMonthIdx === -1) currentMonthIdx = fullMonthNamesSpa.findIndex(m => headerText.includes(m));

                if (headerText.includes(String(targetYear)) && currentMonthIdx !== -1) {
                    if (currentMonthIdx > targetMonthIdx) {
                        await prevBtn.click().catch(() => {});
                    } else {
                        await nextBtn.click().catch(() => {});
                    }
                } else {
                    const yearMatch = headerText.match(/\d{4}/);
                    const currentYear = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
                    if (currentYear > targetYear || (currentYear === targetYear && currentMonthIdx > targetMonthIdx)) {
                        await prevBtn.click().catch(() => {});
                    } else {
                        await nextBtn.click().catch(() => {});
                    }
                }
                await page.waitForTimeout(400);
            }

            // Click the day cell with real physical mouse coordinates
            console.log(`👆 Haciendo clic físico en el día ${targetDay} en el calendario...`);
            const dayCell = page.locator('.daterangepicker:visible td.day:not(.off):not(.old):not(.new), .datepicker:visible td.day:not(.off):not(.old):not(.new), td.available:not(.off), td:not(.off)').filter({ hasText: new RegExp(`^\\s*${targetDay}\\s*$`) }).first();
            if (await dayCell.isVisible().catch(() => false)) {
                await dayCell.scrollIntoViewIfNeeded().catch(() => {});
                await dayCell.hover().catch(() => {});
                await page.waitForTimeout(300);
                await dayCell.click({ force: true });
                console.log(`✅ Clic físico realizado en el día ${targetDay}.`);
            } else {
                await page.evaluate((day) => {
                    const picker = document.querySelector('.daterangepicker:not([style*="display: none"]), .datepicker:not([style*="display: none"])') || document;
                    const days = Array.from(picker.querySelectorAll('td.day:not(.off):not(.old):not(.new), td.available:not(.off), td:not(.off)'));
                    const exact = days.find(td => td.innerText.trim() === String(day));
                    if (exact) exact.click();
                }, targetDay);
            }
            await page.waitForTimeout(1000);
        }
    } catch (e) {
        console.log(`⚠️ Error al seleccionar fecha por clics: ${e.message}`);
    }

    // Set patient fields, duration, place of service, date and time
    await page.evaluate(({ pId, pName, targetDate, tIn, dur, pos }) => {
        const modal = document.querySelector('#gestion_cita_modal');
        const jQ = window.jQuery;
        if (!jQ || !modal) return;

        // 1. Patient selection (single & multi)
        const pSel = jQ(modal).find('#cita_paciente_id');
        if (pSel.length) {
            if (!pSel.find(`option[value="${pId}"]`).length) {
                pSel.append(new Option(pName, pId, true, true));
            }
            pSel.val(pId).trigger('change');
        }

        const pMultiSel = jQ(modal).find('#cita_pacientes_ids');
        if (pMultiSel.length) {
            if (!pMultiSel.find(`option[value="${pId}"]`).length) {
                pMultiSel.append(new Option(pName, pId, true, true));
            }
            pMultiSel.val([pId]).trigger('change');
        }

        // 2. Case Manager Worker (preserve active worker or select first valid option)
        const cmSel = jQ(modal).find('#cita_trabajador_id');
        if (cmSel.length) {
            const currentVal = cmSel.val();
            if (!currentVal) {
                const firstOpt = cmSel.find('option[value!=""]').first().val();
                cmSel.val(firstOpt || '473').trigger('change');
            }
        }

        // 3. Duration
        const durInp = jQ(modal).find('#cita_duracion_mins');
        if (durInp.length) durInp.val(dur).trigger('change').trigger('input');

        // 4. Place of Service mapping
        const placeSel = jQ(modal).find('#cita_place');
        if (placeSel.length) {
            const p = (pos || '').toLowerCase();
            let targetPlace = 'office_visit';
            if (p.includes('12') || p.includes('home') || p.includes('hogar') || p.includes('domicilio')) {
                targetPlace = 'home_visit';
            } else if (p.includes('10') || p.includes('telehealth') || p.includes('telesalud')) {
                targetPlace = 'telehealth';
            } else if (p.includes('99') || p.includes('other') || p.includes('otro')) {
                targetPlace = '99';
            } else if (p.includes('03') || p.includes('school') || p.includes('escuela')) {
                targetPlace = '03';
            } else {
                targetPlace = 'office_visit';
            }
            placeSel.val(targetPlace).trigger('change');
        }

        // 5. Date & Time setting on #cita_fecha_hora
        const fechaHoraInp = jQ(modal).find('#cita_fecha_hora');
        if (fechaHoraInp.length && targetDate) {
            const parts = targetDate.split('-');
            const y = parseInt(parts[0], 10);
            const mIdx = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const monthNamesSpa = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const formattedDate = `${d} de ${monthNamesSpa[mIdx]} de ${y}`;
            const fullFormatted = tIn ? `${formattedDate} ${tIn}` : formattedDate;

            fechaHoraInp.removeAttr('readonly');
            fechaHoraInp.val(fullFormatted);

            const drp = fechaHoraInp.data('daterangepicker');
            if (drp && window.moment) {
                const timeStr = tIn || '10:00 AM';
                const m = window.moment(`${targetDate} ${timeStr}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']);
                if (m.isValid()) {
                    drp.startDate = m.clone();
                    drp.endDate = m.clone();
                    if (typeof drp.setStartDate === 'function') drp.setStartDate(m.clone());
                    if (typeof drp.setEndDate === 'function') drp.setEndDate(m.clone());
                    if (typeof drp.updateElement === 'function') {
                        drp.updateElement();
                    }
                }
            }
            fechaHoraInp.val(fullFormatted).trigger('change').trigger('input');
        }

        // Hide popups
        jQ('.bootstrap-datetimepicker-widget, .daterangepicker').hide();
    }, {
        pId: patientEmrId,
        pName: patientName,
        targetDate: isoDate,
        tIn: timeInRaw,
        dur: durationMins,
        pos: posStr
    });

    // Verify values before saving
    const finalFormValues = await page.evaluate(() => {
        const modal = document.querySelector('#gestion_cita_modal');
        return {
            fecha_hora: modal?.querySelector('#cita_fecha_hora, input[name="cita_fecha_hora"]')?.value || 'not found',
            place: modal?.querySelector('#cita_place, select[name="cita_place"]')?.value || 'not found',
            dur: modal?.querySelector('#cita_duracion_mins, input[name="cita_duracion_mins"]')?.value || 'not found'
        };
    });
    console.log(`⏰ Valores verificados antes de guardar cita TCM: Fecha/Hora='${finalFormValues.fecha_hora}', POS='${finalFormValues.place}', Duración='${finalFormValues.dur}'`);
    await page.waitForTimeout(500);

    if (forceNonBillable || payload.non_billable) {
        console.log("☑️ Marcando cita como No Facturable antes de guardar...");
        await page.evaluate(() => {
            const inp = document.querySelector('#cita_no_facturable, input[name*="no_facturable"], #no_facturable');
            if (inp) {
                inp.checked = true;
                inp.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(inp).prop('checked', true).trigger('change');
            }
        });
        const nbInp = page.locator('#cita_no_facturable, input[name*="no_facturable"], label:has-text("No Facturable") input, label:has-text("Non-billable") input').first();
        if (await nbInp.isVisible().catch(() => false)) {
            if (!await nbInp.isChecked()) await nbInp.click({ force: true });
        }
        await page.waitForTimeout(500);
    }

    // Click GUARDAR button and capture response
    console.log("💾 Guardando la nueva cita TCM...");
    let createdCitaId = null;
    const [response] = await Promise.all([
        page.waitForResponse(resp => {
            const u = resp.url();
            return (u.includes('saveCita') || u.includes('save_cita') || u.includes('cita') || u.includes('store')) && (resp.request().method() === 'POST' || resp.request().method() === 'PUT');
        }, { timeout: 6000 }).catch(() => null),
        page.evaluate(() => {
            const btn = document.querySelector('#save_cita_btn, button.btn-save-cita, #guardar_cita_btn') || 
                Array.from(document.querySelectorAll('#gestion_cita_modal button, #gestion_cita_modal a, a, button'))
                    .find(b => b.innerText && /GUARDAR|SAVE|Save Changes|Guardar Cita|Save Appointment/i.test(b.innerText.trim()));
            if (btn) {
                btn.click();
                if (window.jQuery) window.jQuery(btn).trigger('click');
            }
        })
    ]);

    if (response) {
        try {
            const json = await response.json();
            createdCitaId = json.id || json.cita_id || json.data?.id || json.data?.cita_id || json.cita?.id || (json.appointment && json.appointment.id);
            if (createdCitaId) {
                console.log(`⚡ Cita creada con éxito en Amexzone (ID: ${createdCitaId})`);
            }
        } catch (e) {}
    }

    await waitForLoader(page);

    // Check for Notiflix alerts or errors with responsive timeout
    const notiflixReport = page.locator('#NotiflixReportWrap:visible, .notiflix-report:visible, .nx-report-wrap:visible').first();
    const hasReport = await notiflixReport.waitFor({ state: 'visible', timeout: 1200 }).then(() => true).catch(() => false);
    if (hasReport || await notiflixReport.isVisible().catch(() => false)) {
        const reportText = await notiflixReport.innerText().catch(() => "");
        console.log(`📋 Notiflix Report detectado: ${reportText.replace(/\n/g, ' ')}`);
        
        const lowerReport = reportText.toLowerCase();
        if (
            lowerReport.includes('ya existe encuentro') || 
            lowerReport.includes('existe encuentro') || 
            lowerReport.includes('abierta para el') ||
            lowerReport.includes('already exist') ||
            lowerReport.includes('already exists') ||
            lowerReport.includes('has an progress note open') ||
            lowerReport.includes('has a progress note open') ||
            lowerReport.includes('has an open progress note')
        ) {
            console.log("👉 Amexzone indicó que ya existe un encuentro abierto para esta fecha. Entrando a gestionar el encuentro existente...");
            const clickLink = notiflixReport.locator('a').first();
            const href = await clickLink.getAttribute('href').catch(() => null);
            if (href) {
                const fullUrl = href.startsWith('http') ? href : `https://www.amexzone.com${href.startsWith('/') ? '' : '/'}${href}`;
                console.log(`🌐 Navegando directamente al encuentro existente: ${fullUrl}...`);
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
            } else if (await clickLink.isVisible().catch(() => false)) {
                await clickLink.click();
            } else {
                const closeBtn = notiflixReport.locator('button, a').filter({ hasText: /Cerrar|Close|OK|Entendido/i }).first();
                if (await closeBtn.isVisible().catch(() => false)) {
                    await closeBtn.click();
                }
            }
            await page.evaluate(() => {
                const m = document.querySelector('#gestion_cita_modal');
                if (m) {
                    m.classList.remove('show');
                    m.style.display = 'none';
                    if (window.jQuery) window.jQuery(m).modal('hide');
                }
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(b => b.remove());
                document.body.classList.remove('modal-open');
            }).catch(() => {});
            await waitForLoader(page);
            return;
        }

        if (lowerReport.includes('no tiene unidades aprobadas') || lowerReport.includes('no tiene unidades') || lowerReport.includes('no approved units')) {
            const closeBtn = notiflixReport.locator('button, a').filter({ hasText: /Cerrar|Close|OK/i }).first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click().catch(() => {});
            }
            const cleanMsg = `Amexzone: El paciente no cuenta con unidades aprobadas de Progress Note - TCM para la fecha seleccionada (${visitDate}). Por favor, modifique la fecha de visita en Clio y vuelva a sincronizar.`;
            console.error(`❌ ${cleanMsg}`);
            throw new Error(cleanMsg);
        }

        if (lowerReport.includes('superposici') || lowerReport.includes('overlap') || lowerReport.includes('conflicto') || lowerReport.includes('horario no permitido') || lowerReport.includes('existe un servicio')) {
            const m = reportText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(?:-|a|to)\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (m) {
                occupiedRanges.push({ start: m[1].trim(), end: m[2].trim() });
            }
            const suggestedSlot = calculateNextAvailableSlot(occupiedRanges, durationMins, timeInStr);
            const cleanMsg = reportText.replace(/\n+/g, ' ').trim();
            console.error(`❌ Superposición de horario detectada en Amexzone: ${cleanMsg}`);
            throw new Error(`Conflicto de horario en Amexzone: ${cleanMsg} [SUGGESTED_TIME: ${suggestedSlot}]`);
        }

        const cleanMsg = reportText.replace(/\n+/g, ' ').trim();
        console.error(`❌ Error reportado por Amexzone: ${cleanMsg}`);
        throw new Error(`Amexzone rechazó la cita: ${cleanMsg}`);
    }

    // Direct Instant Navigation if ID was captured from AJAX response
    if (createdCitaId) {
        console.log(`🚀 Navegando directamente a pantalla de atención médica: https://www.amexzone.com/attend/appointment/${createdCitaId}?trace=1`);
        await page.goto(`https://www.amexzone.com/attend/appointment/${createdCitaId}?trace=1`, { waitUntil: 'domcontentloaded' });
        await waitForLoader(page);
        return;
    }

    // Wait for creation modal to dismiss
    await page.waitForSelector('#gestion_cita_modal', { state: 'hidden', timeout: 3000 }).catch(() => {});
    await waitForLoader(page);
};

const openAppointmentForEditing = async (page, visitDate, pin) => {
    const isAlreadyInEncounter = (page.url().includes('/encounter') || page.url().includes('/attend')) && !page.url().endsWith('.com/') && !page.url().includes('/inicio');
    if (isAlreadyInEncounter) {
        console.log("🎯 El navegador ya se encuentra dentro de la pantalla de atención/encuentro. Omitiendo búsqueda de cita...");
        await handlePin(page, pin);
        return;
    }

    console.log("🔍 Localizando la cita creada en estado Pendiente...");
    await waitForLoader(page);

    // Ensure any open backdrop or modal is cleared
    await page.evaluate(() => {
        const m = document.querySelector('#gestion_cita_modal');
        if (m) {
            m.classList.remove('show');
            m.style.display = 'none';
            if (window.jQuery) window.jQuery(m).modal('hide');
        }
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(b => b.remove());
        document.body.classList.remove('modal-open');
    }).catch(() => {});

    // Check if preview modal (#cita_model_view_modal) is already open right after creation
    const previewModal = page.locator('#cita_model_view_modal:visible, .modal.show:has-text("Manage"), .modal.show:has-text("Gestionar")').first();
    if (await previewModal.isVisible().catch(() => false)) {
        console.log("⚙️ Modal de vista previa de cita ya abierto. Entrando directamente a Manage / Gestionar...");
        const mBtn = previewModal.locator('a, button').filter({ hasText: /Manage|Gestionar|Attend|Atender/i }).first();
        if (await mBtn.isVisible().catch(() => false)) {
            await mBtn.click();
            await waitForLoader(page);
            await handlePin(page, pin);
            return;
        }
    }

    // Direct attend link check in Vue or table DOM
    const directAttendHref = await page.evaluate((dateList) => {
        if (typeof vuem !== 'undefined') {
            const list = vuem.citas || vuem.appointments || vuem.citas_list || [];
            const arr = Array.isArray(list) ? list : Object.values(list);
            for (const item of arr) {
                const itemDate = String(item.fecha || item.date || item.fecha_inicio || item.start || '');
                for (const d of dateList) {
                    if (itemDate.includes(d)) {
                        const targetId = item.id || item.cita_id || item.appointment_id;
                        if (targetId) return `/attend/appointment/${targetId}?trace=1`;
                    }
                }
            }
        }
        const rows = Array.from(document.querySelectorAll('table tbody tr, .list-group-item, tr, div[class*="row"]'));
        for (const r of rows) {
            const text = r.innerText || '';
            for (const d of dateList) {
                if (text.toLowerCase().includes(d.toLowerCase())) {
                    const a = Array.from(r.querySelectorAll('a')).find(el => el.getAttribute('href') && el.getAttribute('href').includes('attend'));
                    if (a) return a.getAttribute('href');
                }
            }
        }
        return null;
    }, generateDateVariants(visitDate));

    if (directAttendHref) {
        const fullUrl = directAttendHref.startsWith('http') ? directAttendHref : `https://www.amexzone.com${directAttendHref.startsWith('/') ? '' : '/'}${directAttendHref}`;
        console.log(`🌐 Navegando directamente a la pantalla de atención médica encontrada: ${fullUrl}...`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        await handlePin(page, pin);
        await waitForLoader(page);
        return;
    }

    let appointmentRow = await findExistingAppointment(page, visitDate);
    if (!appointmentRow) {
        await page.evaluate(() => {
            if (typeof vuem !== 'undefined') {
                if (vuem.fetchList) vuem.fetchList('appointments');
                if (vuem.getCitasXFechas) vuem.getCitasXFechas();
            }
        });
        await waitForLoader(page);
        appointmentRow = await findExistingAppointment(page, visitDate);
    }

    if (appointmentRow) {
        try {
            await appointmentRow.scrollIntoViewIfNeeded().catch(() => {});
            for (const variant of generateDateVariants(visitDate)) {
                const dateSpan = page.locator(`text="${variant}"`).first();
                if (await dateSpan.isVisible().catch(() => false)) {
                    console.log(`👆 Clic en texto de fecha de la cita: "${variant}"...`);
                    await dateSpan.click({ force: true }).catch(() => {});
                    break;
                }
            }
            await appointmentRow.click({ force: true }).catch(() => {});
        } catch (e) {
            await appointmentRow.evaluate(el => el.click()).catch(() => {});
        }

        const modal = page.locator('#cita_model_view_modal, .modal.show').first();
        if (await modal.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            // First ensure any access code modal is unlocked
            await handlePin(page, pin);
            
            const manageBtn = modal.locator('a, button').filter({ hasText: /Manage|Gestionar|Attend|Atender/i }).first();
            if (await manageBtn.isVisible().catch(() => false)) {
                const href = await manageBtn.getAttribute('href').catch(() => null);
                if (href && (href.startsWith('http') || href.startsWith('/attend/'))) {
                    const fullUrl = href.startsWith('http') ? href : `https://www.amexzone.com${href}`;
                    console.log(`🚀 Navegando directamente a la cita: ${fullUrl}...`);
                    await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
                } else {
                    await manageBtn.click({ force: true }).catch(async () => {
                        await manageBtn.evaluate(el => el.click()).catch(() => {});
                    });
                }
                await handlePin(page, pin);
                await waitForLoader(page);
                return;
            }
        }
    }

    await handlePin(page, pin);
    await waitForLoader(page);
};

const updateAppointmentDate = async (page, appointmentRow, visitDate, pin) => {
    let dateVal = visitDate;
    if (visitDate && !visitDate.includes('-')) {
        const dateObj = new Date(visitDate);
        if (dateObj && !isNaN(dateObj.getTime())) {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            dateVal = `${y}-${m}-${d}`;
        }
    }

    console.log(`✏️ Modificando la fecha de la cita a ${dateVal}...`);
    const link = appointmentRow.locator('a, button, span').filter({ hasText: /Progress Note|Pendiente|Pending|Encuentro|Cita/i }).first();
    if (await link.isVisible().catch(() => false)) {
        await link.click();
    } else {
        await appointmentRow.click();
    }
    await page.waitForTimeout(2500);

    // Look for "Editar" / "Editar Cita" button inside modal or view
    const editBtn = page.locator('#cita_model_view_modal a, #cita_model_view_modal button, button, a').filter({ hasText: /Editar|Edit/i }).filter({ visible: true }).first();
    if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(2000);

        // Fill date in edit modal
        const modal = page.locator('.modal.show, .modal.in, div[role="dialog"]').filter({ visible: true }).first();
        const activeInput = modal.locator('#cita_fecha_hora, input[name="cita_fecha_hora"], input[type="date"], input[name="date"], input[name="fecha"]').first();
        if (await activeInput.isVisible().catch(() => false)) {
            await activeInput.evaluate((el, val) => {
                if (window.jQuery && window.jQuery(el).data('daterangepicker')) {
                    const drp = window.jQuery(el).data('daterangepicker');
                    drp.setStartDate(val);
                    drp.setEndDate(val);
                    const formatted = drp.startDate.format(drp.locale && drp.locale.format ? drp.locale.format : 'YYYY-MM-DD');
                    window.jQuery(el).val(formatted);
                    window.jQuery(el).trigger('change').trigger('apply.daterangepicker');
                } else if (el._flatpickr) {
                    el._flatpickr.setDate(val, true);
                } else if (window.jQuery && window.jQuery(el).data('datepicker')) {
                    window.jQuery(el).datepicker('setDate', val);
                } else {
                    el.removeAttribute('readonly');
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, dateVal);
            await page.waitForTimeout(1000);
            await page.keyboard.press('Escape');

            // Save edited appointment
            const guardarBtn = modal.locator('#save_cita_btn, #btn_guardar_cita, button, a, .btn').filter({ hasText: /GUARDAR|Save/i }).filter({ visible: true }).first();
            if (await guardarBtn.isVisible().catch(() => false)) {
                await guardarBtn.click({ force: true });
                await page.waitForTimeout(2000);
                await waitForLoader(page);
            }
        }
    }
};

module.exports = {
    generateDateVariants,
    ensureCitasTab,
    findExistingAppointment,
    createNewAppointment,
    openAppointmentForEditing,
    updateAppointmentDate,
    calculateNextAvailableSlot
};
