const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    page.on('request', req => {
        if (req.url().includes('saveCitaServicio')) {
            console.log('📡 POST /saveCitaServicio BODY:', req.postData());
        }
    });

    page.on('response', async res => {
        if (res.request().url().includes('saveCitaServicio')) {
            console.log('📥 POST /saveCitaServicio RESP:', await res.text());
        }
    });

    await page.goto('https://www.amexzone.com/attend/appointment/1585805', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    // Dismiss any Notiflix or overlay
    await page.evaluate(() => {
        const closeBtn = document.querySelector('#NotiflixReportWrap button, #NotiflixConfirmWrap button, .notiflix-confirm-button');
        if (closeBtn) closeBtn.click();
    });
    await page.waitForTimeout(1000);

    // Click EDIT SERVICE using evaluate
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    
    const modal = page.locator('#new_service_modal, #edit_service_modal, .modal.show').first();
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Modal is open and visible.');

    // Helper for visual selection
    const selectVisualTime = async (inputSel, hTargetStr, mTargetStr, merTarget) => {
        const input = modal.locator(inputSel).first();
        await input.click({ force: true });
        await page.waitForTimeout(300);

        const widget = page.locator('.bootstrap-datetimepicker-widget:visible').first();
        if (await widget.isVisible()) {
            // 1. Hours
            const showH = widget.locator('span.timepicker-hour[data-action="showHours"]').first();
            if (await showH.isVisible()) {
                await showH.click({ force: true });
                await page.waitForTimeout(200);
                const hourTd = widget.locator(`.timepicker-hours td[data-action="selectHour"]:has-text("${hTargetStr}")`).first();
                if (await hourTd.isVisible()) {
                    await hourTd.click({ force: true });
                    await page.waitForTimeout(200);
                }
            }

            // 2. Minutes
            const showM = widget.locator('span.timepicker-minute[data-action="showMinutes"]').first();
            if (await showM.isVisible()) {
                await showM.click({ force: true });
                await page.waitForTimeout(200);
                const minTd = widget.locator(`.timepicker-minutes td[data-action="selectMinute"]:has-text("${mTargetStr}")`).first();
                if (await minTd.isVisible()) {
                    await minTd.click({ force: true });
                    await page.waitForTimeout(200);
                }
            }

            // 3. Period (AM / PM)
            const periodBtn = widget.locator('button[data-action="togglePeriod"]').first();
            if (await periodBtn.isVisible()) {
                const cur = (await periodBtn.innerText()).trim().toUpperCase();
                if (cur !== merTarget.toUpperCase()) {
                    await periodBtn.click({ force: true });
                    await page.waitForTimeout(200);
                }
            }

            // Close popup
            await page.evaluate(() => {
                if (window.jQuery) window.jQuery('.bootstrap-datetimepicker-widget').hide();
            });
        }
    };

    console.log('⏰ Seleccionando Hora Inicio 05:25 PM...');
    await selectVisualTime('#temp_service_hora_inicio', '05', '25', 'PM');
    await page.waitForTimeout(300);

    console.log('⏰ Seleccionando Hora Fin 06:25 PM...');
    await selectVisualTime('#temp_service_hora_fin', '06', '25', 'PM');
    await page.waitForTimeout(300);

    // Place of service
    const placeSelect = modal.locator('select#temp_service_place');
    if (await placeSelect.isVisible()) {
        await placeSelect.selectOption('home_visit');
    }

    // Duration
    const durInp = modal.locator('input#temp_service_duracion_mins');
    if (await durInp.isVisible()) {
        await durInp.fill('60');
    }

    const valuesBeforeSave = await page.evaluate(() => {
        return {
            startInp: document.querySelector('#temp_service_hora_inicio')?.value,
            endInp: document.querySelector('#temp_service_hora_fin')?.value,
            dur: document.querySelector('#temp_service_duracion_mins')?.value,
            place: document.querySelector('#temp_service_place')?.value
        };
    });
    console.log('VALUES BEFORE SAVE:\n', JSON.stringify(valuesBeforeSave, null, 2));

    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = modal.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    // Save changes on encounter
    const saveChangesBtn = page.locator('button:has-text("GUARDAR CAMBIOS"), a:has-text("GUARDAR CAMBIOS")').first();
    if (await saveChangesBtn.isVisible()) {
        console.log('👆 Haciendo clic en GUARDAR CAMBIOS...');
        await saveChangesBtn.click({ force: true });
        await page.waitForTimeout(4000);
    }

    const finalState = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tarea = vm?.citas?.[citaKey]?.tareas?.[0];
        return {
            tarea_hora_inicio: tarea?.hora_inicio,
            tarea_hora_fin: tarea?.hora_fin,
            tarea_duracion: tarea?.duracion_mins,
            tarea_place: tarea?.place
        };
    });

    console.log('FINAL VUE STATE:\n', JSON.stringify(finalState, null, 2));
    await context.close();
}

main().catch(console.error);
