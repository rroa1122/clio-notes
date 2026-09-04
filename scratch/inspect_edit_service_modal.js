const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1584935', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    // Open EDIT SERVICE modal
    const editBtn = page.locator('a:has-text("EDITAR SERVICIO"), a:has-text("EDIT SERVICE"), button:has-text("EDIT SERVICE"), button:has-text("EDITAR SERVICIO")').first();
    if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(2000);
    }

    const modalElements = await page.evaluate(() => {
        const m = document.querySelector('#new_service_modal, #edit_service_modal, .modal.show');
        if (!m) return 'no modal';
        return {
            id: m.id,
            className: m.className,
            inputs: Array.from(m.querySelectorAll('input, select, textarea, button')).map(el => ({
                tag: el.tagName,
                id: el.id,
                name: el.name,
                type: el.type,
                value: el.value,
                label: el.closest('.form-group, div')?.querySelector('label')?.innerText || ''
            }))
        };
    });

    console.log('EDIT SERVICE MODAL ELEMENTS:\n', JSON.stringify(modalElements, null, 2));
    await context.close();
}

main().catch(console.error);
