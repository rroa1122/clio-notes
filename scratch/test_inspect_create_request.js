const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/patient/27510&v=2', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    const citasTab = page.locator('a:has-text("Citas"), a:has-text("Appointments")').first();
    if (await citasTab.isVisible()) await citasTab.click();
    await page.waitForTimeout(2000);

    const nuevaCitaBtn = page.locator('button:has-text("Nueva Cita"), a:has-text("Nueva Cita"), button:has-text("New Appointment"), a:has-text("New Appointment")').first();
    if (await nuevaCitaBtn.isVisible()) await nuevaCitaBtn.click();
    await page.waitForTimeout(2000);

    // Fill the modal form using Playwright locators directly
    const patientSel = page.locator('#cita_paciente_id');
    await page.evaluate(() => {
        const jQ = window.jQuery;
        if (jQ) {
            const pSel = jQ('#cita_paciente_id');
            if (!pSel.find('option[value="27510"]').length) {
                pSel.append(new Option('Testthiago Six', '27510', true, true));
            }
            pSel.val('27510').trigger('change');
            jQ('#cita_trabajador_id').val('473').trigger('change');
        }
    });

    const durInput = page.locator('#cita_duracion_mins');
    await durInput.fill('60');

    const placeSelect = page.locator('#cita_place');
    await placeSelect.selectOption('home_visit');

    // Date and time input
    const fechaInp = page.locator('#cita_fecha_hora');
    await page.evaluate(() => {
        const inp = document.querySelector('#cita_fecha_hora');
        inp.removeAttribute('readonly');
        inp.value = '1 de agosto de 2026 10:00 AM';
        if (window.jQuery) {
            window.jQuery(inp).val('1 de agosto de 2026 10:00 AM').trigger('change').trigger('input');
        }
    });

    // Intercept POST requests to see what is sent
    page.on('request', req => {
        if (req.method() === 'POST') {
            console.log('📡 POST URL:', req.url());
            console.log('📡 POST DATA:', req.postData());
        }
    });

    page.on('response', async res => {
        if (res.request().method() === 'POST') {
            try {
                const txt = await res.text();
                console.log('📥 STATUS:', res.status(), 'RESPONSE:', txt.slice(0, 300));
            } catch(e) {}
        }
    });

    console.log('👆 Clic en Guardar...');
    const saveBtn = page.locator('#save_cita_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(5000);

    await context.close();
}

main().catch(console.error);
