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

    // Click EDIT SERVICE via evaluate
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    // Inspect all inputs and search for saveCitaServicio in all loaded scripts
    const allInputs = await page.evaluate(() => {
        const modal = document.querySelector('#new_service_modal');
        const inputs = Array.from(modal.querySelectorAll('input, select, textarea')).map(el => ({
            tag: el.tagName,
            id: el.id,
            name: el.name,
            type: el.type,
            value: el.value
        }));

        // Search in all script contents for saveCitaServicio
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText || '').filter(t => t.includes('saveCitaServicio'));

        return {
            inputs,
            scripts: scripts.map(s => s.slice(0, 2000))
        };
    });

    console.log('ALL MODAL INPUTS:\n', JSON.stringify(allInputs.inputs, null, 2));
    if (allInputs.scripts.length > 0) {
        console.log('SCRIPT THAT CALLS saveCitaServicio:\n', allInputs.scripts[0]);
    }

    await context.close();
}

main().catch(console.error);
