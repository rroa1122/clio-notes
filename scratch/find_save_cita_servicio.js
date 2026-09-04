const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1593889', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const scriptMatch = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerText);
        const matchInline = Array.from(document.querySelectorAll('script')).filter(s => !s.src && s.innerText.includes('saveCitaServicio')).map(s => s.innerText);
        return {
            scriptSrcs: scripts.filter(s => s.startsWith('http')),
            matchInline: matchInline.map(t => {
                const idx = t.indexOf('saveCitaServicio');
                return t.substring(Math.max(0, idx - 200), Math.min(t.length, idx + 800));
            })
        };
    });

    console.log('SCRIPTS MATCHING saveCitaServicio:\n', JSON.stringify(scriptMatch, null, 2));
    await context.close();
}

main().catch(console.error);
