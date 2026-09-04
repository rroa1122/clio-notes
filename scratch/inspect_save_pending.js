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

    const fnCode = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        return {
            saveServicePendingChanges: vm?.$options?.methods?.saveServicePendingChanges?.toString() || 'not found',
            updateServiceInCita: vm?.$options?.methods?.updateServiceInCita?.toString() || 'not found'
        };
    });

    console.log('METHODS CODE:\n', JSON.stringify(fnCode, null, 2));
    await context.close();
}

main().catch(console.error);
