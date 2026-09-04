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

    const fnStr = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        return {
            saveCitaServicio: vm?.saveCitaServicio?.toString(),
            setTempService: vm?.setTempService?.toString(),
            editCitaServicio: vm?.editCitaServicio?.toString(),
            temp_service: vm?.temp_service
        };
    });

    console.log('VUE METHODS ON ATTEND PAGE:\n', JSON.stringify(fnStr, null, 2));
    await context.close();
}

main().catch(console.error);
