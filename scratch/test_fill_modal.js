const path = require('path');
const { launchBrowserContext, setupPageInterceptors, waitForLoader } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', `user_data_provider_${userId}`);
    
    const launchOptions = {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1366,768',
            '--start-maximized'
        ]
    };
    
    const context = await launchBrowserContext(userDataDir, launchOptions, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    console.log('🌐 Navegando a la cita en pantalla...');
    await page.goto('https://www.amexzone.com/attend/appointment/1584757', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code, input#access_code').first();
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn, button:has-text("ENTER")').first();
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    // Open EDITAR SERVICIO
    console.log('👆 Abriendo modal EDITAR SERVICIO...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, div, span'));
        const b = btns.find(el => /EDITAR SERVICIO|EDIT SERVICE/i.test(el.innerText || ''));
        if (b) b.click();
    });
    await page.waitForTimeout(1500);

    // Test filling values: 09:38 AM - 10:20 AM, duration 42, place office_visit
    await page.evaluate(() => {
        const m = document.querySelector('#new_service_modal, .modal.show') || document;
        
        // 1. Name
        const nameInp = m.querySelector('#temp_service_name');
        if (nameInp) {
            nameInp.value = 'OTC Benefit Coordination for Depressed Client to Maintain Medication Access';
            nameInp.dispatchEvent(new Event('input', { bubbles: true }));
            nameInp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 2. Place
        const placeSel = m.querySelector('#temp_service_place');
        if (placeSel) {
            placeSel.value = 'office_visit';
            placeSel.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) window.jQuery(placeSel).val('office_visit').trigger('change');
        }

        // 3. Start & End
        const startInp = m.querySelector('#temp_service_hora_inicio');
        const endInp = m.querySelector('#temp_service_hora_fin');
        const durInp = m.querySelector('#temp_service_duracion_mins');

        if (startInp) {
            startInp.value = '09:38 AM';
            startInp.dispatchEvent(new Event('input', { bubbles: true }));
            startInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) {
                const jStart = window.jQuery(startInp);
                jStart.val('09:38 AM').trigger('change').trigger('input').trigger('dp.change');
                const dtp = jStart.data('DateTimePicker');
                if (dtp) {
                    const d = new Date(); d.setHours(9, 38, 0, 0);
                    try { dtp.date(d); } catch(e){}
                }
            }
        }

        if (endInp) {
            endInp.value = '10:20 AM';
            endInp.dispatchEvent(new Event('input', { bubbles: true }));
            endInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) {
                const jEnd = window.jQuery(endInp);
                jEnd.val('10:20 AM').trigger('change').trigger('input').trigger('dp.change');
                const dtp = jEnd.data('DateTimePicker');
                if (dtp) {
                    const d = new Date(); d.setHours(10, 20, 0, 0);
                    try { dtp.date(d); } catch(e){}
                }
            }
        }

        if (durInp) {
            durInp.value = '42';
            durInp.dispatchEvent(new Event('input', { bubbles: true }));
            durInp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Hide datepicker widgets
        if (window.jQuery) window.jQuery('.bootstrap-datetimepicker-widget').hide();
    });

    await page.waitForTimeout(1000);

    // Click Guardar button in modal (#save_service_btn)
    const saveBtn = page.locator('#save_service_btn, #new_service_modal .btn-info, a:has-text("Guardar"), button:has-text("Guardar")').first();
    console.log('👆 Haciendo clic en #save_service_btn...');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(3000);

    // Check if error modal appeared or if service saved
    const alertInfo = await page.evaluate(() => {
        const swal = document.querySelector('.swal2-modal, #NotiflixConfirmWrap, .notiflix-confirm');
        if (swal && swal.offsetParent !== null) {
            return { hasAlert: true, text: swal.innerText };
        }
        return { hasAlert: false };
    });

    console.log('RESULTADO DE GUARDADO:', JSON.stringify(alertInfo, null, 2));

    await page.waitForTimeout(8000);
    await context.close();
}

main().catch(console.error);
