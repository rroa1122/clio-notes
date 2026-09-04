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

    const html = await page.content();
    const idx = html.indexOf('save_service_btn');
    if (idx !== -1) {
        console.log('HTML AROUND save_service_btn:\n', html.slice(Math.max(0, idx - 400), idx + 800));
    } else {
        console.log('save_service_btn not found in static HTML');
    }

    // Also search for temp_service_hora_inicio in HTML
    const idx2 = html.indexOf('temp_service_hora_inicio');
    if (idx2 !== -1) {
        console.log('HTML AROUND temp_service_hora_inicio:\n', html.slice(Math.max(0, idx2 - 300), idx2 + 600));
    }

    await context.close();
}

main().catch(console.error);
