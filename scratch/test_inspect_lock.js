const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1585601', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    const lockInfo = await page.evaluate(() => {
        const lockEl = Array.from(document.querySelectorAll('div, p, span')).find(el => /otra pestaña o dispositivo/i.test(el.innerText || ''));
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        return {
            hasLockText: !!lockEl,
            lockHtml: lockEl ? lockEl.closest('.card, .modal, div')?.outerHTML.slice(0, 500) : null,
            vueEditLock: vm?.editLock || vm?.lock || vm?.is_locked,
            vueDataKeys: vm ? Object.keys(vm.$data || {}) : []
        };
    });

    console.log('LOCK INFO:\n', JSON.stringify(lockInfo, null, 2));
    await context.close();
}

main().catch(console.error);
