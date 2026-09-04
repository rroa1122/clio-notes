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

    const scriptMatch = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (let i = 0; i < scripts.length; i++) {
            const s = scripts[i];
            const txt = s.textContent || s.innerText || '';
            const idx = txt.indexOf('saveCitaServicio');
            if (idx !== -1) {
                return {
                    scriptIndex: i,
                    hasSrc: s.src || 'inline',
                    codeSnippet: txt.slice(Math.max(0, idx - 50), idx + 2000)
                };
            }
        }
        return 'not found in any script';
    });

    console.log('SCRIPT MATCH RESULT:\n', JSON.stringify(scriptMatch, null, 2));
    await context.close();
}

main().catch(console.error);
