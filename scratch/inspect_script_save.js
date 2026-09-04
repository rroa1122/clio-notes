const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1585658', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    const scriptSnippets = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const matches = [];
        for (const s of scripts) {
            const txt = s.innerText || '';
            if (txt.includes('save_service_btn') || txt.includes('temp_service_hora_inicio') || txt.includes('temp_service_name')) {
                matches.push(txt.slice(0, 1000));
            }
        }
        return matches;
    });

    console.log('SCRIPT SNIPPETS FOR SAVE SERVICE:\n', JSON.stringify(scriptSnippets, null, 2));
    await context.close();
}

main().catch(console.error);
