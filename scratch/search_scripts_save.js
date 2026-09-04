const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1585766', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    const scriptUrls = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]')).map(s => s.src));
    
    for (const url of scriptUrls) {
        if (!url.includes('amexzone.com')) continue;
        try {
            const resp = await page.evaluate(async (u) => {
                const r = await fetch(u);
                return await r.text();
            }, url);
            if (resp.includes('saveCitaServicio') || resp.includes('temp_service_hora_inicio')) {
                console.log(`FOUND in script: ${url}`);
                const idx = resp.indexOf('saveCitaServicio');
                if (idx !== -1) {
                    console.log('CODE:\n', resp.slice(Math.max(0, idx - 100), idx + 2500));
                }
            }
        } catch (e) {}
    }

    await context.close();
}

main().catch(console.error);
