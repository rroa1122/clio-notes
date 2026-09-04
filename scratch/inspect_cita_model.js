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

    const details = await page.evaluate(() => {
        const modal = document.querySelector('#gestion_cita_modal');
        let vueInst = modal?.__vue__;
        let p = modal;
        while (!vueInst && p) {
            vueInst = p.__vue__;
            p = p.parentElement;
        }

        if (!vueInst) return 'no vue';

        return {
            cita_model: JSON.parse(JSON.stringify(vueInst.cita_model || {})),
            saveMethods: Object.keys(vueInst.$options?.methods || {}).filter(m => /cita|save|guardar/i.test(m)),
            saveCitaCode: vueInst.saveCita?.toString() || vueInst.guardarCita?.toString() || 'no method'
        };
    });

    console.log('VUE CITA_MODEL & METHODS:\n', JSON.stringify(details, null, 2));
    await context.close();
}

main().catch(console.error);
