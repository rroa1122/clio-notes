const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/patient/27510&v=2', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    const scripts = await page.evaluate(() => {
        const list = [];
        Array.from(document.querySelectorAll('script')).forEach(s => {
            if (s.innerText.includes('gestion_cita_modal') || s.innerText.includes('cita_fecha_hora')) {
                list.push(s.innerText.slice(0, 1500));
            }
        });
        return list;
    });

    console.log('SCRIPTS WITH GESTION CITA MODAL:\n', scripts.join('\n\n--- NEXT ---\n\n'));
    await context.close();
}

main().catch(console.error);
