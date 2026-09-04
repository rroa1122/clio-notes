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

    // Click EDIT SERVICE
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    const saveBtnInfo = await page.evaluate(() => {
        const btn = document.querySelector('#save_service_btn');
        return {
            id: btn?.id,
            className: btn?.className,
            onclick: btn?.getAttribute('onclick'),
            vClick: btn?.getAttribute('@click') || btn?.getAttribute('v-on:click'),
            outerHtml: btn?.outerHTML
        };
    });

    console.log('SAVE SERVICE BTN INFO:\n', JSON.stringify(saveBtnInfo, null, 2));

    // Also inspect any global functions like guardarServicio, saveServicio, etc.
    const globalSaveFns = await page.evaluate(() => {
        const names = Object.keys(window).filter(k => /service|servicio/i.test(k));
        return names;
    });

    console.log('GLOBAL SERVICE FNS:\n', JSON.stringify(globalSaveFns, null, 2));

    await context.close();
}

main().catch(console.error);
