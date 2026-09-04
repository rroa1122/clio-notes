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

    // Inspect how Amexzone queries worker schedule / conflicts
    const calendarEndpoints = await page.evaluate(async () => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        const res = {};
        if (window.axios) {
            try {
                // Check worker appointments for date 2026-08-01 / 2026-08-11
                const r = await window.axios.get('/appointments/calendar/events', {
                    params: { trabajador_id: 473, start: '2026-08-01', end: '2026-08-02' }
                }).catch(e => ({ error: e.message }));
                res.calendarEvents = r.data || r;
            } catch(e) {
                res.err = e.message;
            }
        }
        return res;
    });

    console.log('SCHEDULE QUERY RESULT:\n', JSON.stringify(calendarEndpoints, null, 2));
    await context.close();
}

main().catch(console.error);
