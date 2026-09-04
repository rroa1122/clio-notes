const path = require('path');
const { launchBrowserContext, setupPageInterceptors, waitForLoader } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', `user_data_provider_${userId}`);
    
    const launchOptions = {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1366,768']
    };
    
    const context = await launchBrowserContext(userDataDir, launchOptions, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1584829', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code, input#access_code').first();
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn, button:has-text("ENTER")').first();
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    const vueInfo = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        if (!vm) return 'No vue';
        
        const methods = Object.keys(vm.$options ? vm.$options.methods : {});
        const serviceMethods = methods.filter(m => /service|servicio|tarea|modal|save|guardar/i.test(m));
        
        const result = {
            serviceMethods: serviceMethods,
            functions: {}
        };
        
        serviceMethods.forEach(m => {
            if (typeof vm[m] === 'function') {
                result.functions[m] = vm[m].toString().slice(0, 300);
            }
        });

        return result;
    });

    console.log('VUE INFO:', JSON.stringify(vueInfo, null, 2));
    await context.close();
}

main().catch(console.error);
