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

    // Inspect drp methods
    const drpMethods = await page.evaluate(() => {
        const inp = window.jQuery('#cita_fecha_hora');
        const drp = inp.data('daterangepicker');
        if (!drp) return 'no drp';
        return {
            keys: Object.keys(drp),
            startDate: drp.startDate.format('YYYY-MM-DD HH:mm:ss'),
            endDate: drp.endDate.format('YYYY-MM-DD HH:mm:ss'),
            format: drp.locale.format
        };
    });

    console.log('DRP METHODS & KEYS:\n', JSON.stringify(drpMethods, null, 2));

    // Test setting start date & end date directly on drp
    await page.evaluate(() => {
        const inp = window.jQuery('#cita_fecha_hora');
        const drp = inp.data('daterangepicker');
        if (drp) {
            const m = window.moment('2026-08-01 10:00:00', 'YYYY-MM-DD HH:mm:ss');
            drp.startDate = m.clone();
            drp.endDate = m.clone();
            drp.updateElement();
        }
    });

    await page.waitForTimeout(1000);

    const valAfterUpdate = await page.evaluate(() => {
        return {
            inputVal: document.querySelector('#cita_fecha_hora')?.value
        };
    });

    console.log('VAL AFTER drp.updateElement():\n', JSON.stringify(valAfterUpdate, null, 2));

    await context.close();
}

main().catch(console.error);
