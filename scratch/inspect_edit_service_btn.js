const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1585434', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    const editBtns = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('a, button, span, div')).filter(b => /EDITAR SERVICIO|EDIT SERVICE/i.test(b.innerText || ''));
        return btns.map(b => ({
            tag: b.tagName,
            id: b.id,
            className: b.className,
            onclick: b.getAttribute('onclick'),
            vClick: b.getAttribute('@click') || b.getAttribute('v-on:click'),
            outerHtml: b.outerHTML
        }));
    });

    console.log('EDIT SERVICE BUTTONS:\n', JSON.stringify(editBtns, null, 2));

    // Try clicking the Vue method directly if available
    const vueInfo = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        return {
            hasVm: !!vm,
            methods: Object.keys(vm?.$options?.methods || {}).filter(m => /service|servicio|modal/i.test(m))
        };
    });

    console.log('VUE INFO ON ATTEND PAGE:\n', JSON.stringify(vueInfo, null, 2));

    await context.close();
}

main().catch(console.error);
