const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/appointments', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    const calendarData = await page.evaluate(async () => {
        if (!window.axios) return { error: 'no axios' };
        try {
            const res = await window.axios.get('/citas/empresa/calendario', {
                params: {
                    start: '2026-08-01',
                    end: '2026-08-31'
                }
            });
            const data = Array.isArray(res.data) ? res.data : Object.values(res.data || {});
            return {
                status: res.status,
                count: data.length,
                sample: data.slice(0, 5)
            };
        } catch(e) {
            return { error: e.message };
        }
    });

    console.log('ALL CALENDAR DATA:\n', JSON.stringify(calendarData, null, 2));
    await context.close();
}

main().catch(console.error);
