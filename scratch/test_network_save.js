const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1584872', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    // Intercept requests to see what is sent on save
    page.on('request', req => {
        if (req.url().includes('service') || req.url().includes('servicio') || req.url().includes('tarea') || req.url().includes('cita')) {
            console.log('📡 REQUEST URL:', req.url());
            console.log('📡 POST DATA:', req.postData());
        }
    });

    page.on('response', async res => {
        if (res.url().includes('service') || res.url().includes('servicio') || res.url().includes('tarea') || res.url().includes('cita')) {
            try {
                const text = await res.text();
                console.log('📥 RESPONSE URL:', res.url());
                console.log('📥 RESPONSE BODY:', text.slice(0, 300));
            } catch (e) {}
        }
    });

    // Open EDITAR SERVICIO
    console.log('👆 Abriendo modal EDITAR SERVICIO...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, div, span'));
        const b = btns.find(el => /EDITAR SERVICIO|EDIT SERVICE/i.test(el.innerText || ''));
        if (b) b.click();
    });
    await page.waitForTimeout(1500);

    // Inspect inputs current values
    const currentValues = await page.evaluate(() => {
        const m = document.querySelector('#new_service_modal, .modal.show');
        if (!m) return 'no modal';
        return {
            name: m.querySelector('#temp_service_name')?.value,
            start: m.querySelector('#temp_service_hora_inicio')?.value,
            end: m.querySelector('#temp_service_hora_fin')?.value,
            dur: m.querySelector('#temp_service_duracion_mins')?.value,
            place: m.querySelector('#temp_service_place')?.value
        };
    });
    console.log('CURRENT MODAL VALUES BEFORE FILL:', JSON.stringify(currentValues, null, 2));

    // Fill 09:38 AM - 10:20 AM
    await page.evaluate(() => {
        const m = document.querySelector('#new_service_modal, .modal.show');
        if (!m) return;

        const startInp = m.querySelector('#temp_service_hora_inicio');
        const endInp = m.querySelector('#temp_service_hora_fin');
        const durInp = m.querySelector('#temp_service_duracion_mins');

        if (startInp) {
            startInp.value = '09:38 AM';
            startInp.dispatchEvent(new Event('input', { bubbles: true }));
            startInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) {
                const $st = window.jQuery(startInp);
                $st.val('09:38 AM').trigger('change').trigger('input').trigger('dp.change');
                const dtp = $st.data('DateTimePicker');
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
                const $et = window.jQuery(endInp);
                $et.val('10:20 AM').trigger('change').trigger('input').trigger('dp.change');
                const dtp = $et.data('DateTimePicker');
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
    });

    await page.waitForTimeout(1000);

    const valuesAfterFill = await page.evaluate(() => {
        const m = document.querySelector('#new_service_modal, .modal.show');
        if (!m) return 'no modal';
        return {
            name: m.querySelector('#temp_service_name')?.value,
            start: m.querySelector('#temp_service_hora_inicio')?.value,
            end: m.querySelector('#temp_service_hora_fin')?.value,
            dur: m.querySelector('#temp_service_duracion_mins')?.value,
            place: m.querySelector('#temp_service_place')?.value
        };
    });
    console.log('VALUES AFTER FILL:', JSON.stringify(valuesAfterFill, null, 2));

    // Click Guardar
    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = page.locator('#save_service_btn').first();
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    await context.close();
}

main().catch(console.error);
