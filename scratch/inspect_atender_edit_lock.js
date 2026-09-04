const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/back/js/atender_edit_lock.js?v=2', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const txt = await page.evaluate(() => document.body.innerText);
    console.log('ATENDER_EDIT_LOCK.JS CONTENT:\n', txt);

    await context.close();
}

main().catch(console.error);
