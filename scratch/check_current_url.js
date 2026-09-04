const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1593889', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('CURRENT PAGE URL:', page.url());
    console.log('CURRENT PAGE TITLE:', await page.title());

    const htmlSummary = await page.evaluate(() => {
        const h1 = document.querySelector('h1, h2, h3, h4, h5')?.innerText;
        const main = (document.querySelector('.main-content') || document.body).innerText.slice(0, 500);
        return { h1, main };
    });

    console.log('PAGE SUMMARY:\n', JSON.stringify(htmlSummary, null, 2));
    await context.close();
}

main().catch(console.error);
