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
        await page.waitForTimeout(4000);
    }

    const editBtn = page.locator('a:has-text("EDITAR SERVICIO"), a:has-text("EDIT SERVICE"), button:has-text("EDIT SERVICE"), button:has-text("EDITAR SERVICIO")').first();
    console.log('Is EDIT SERVICE visible?:', await editBtn.isVisible().catch(() => false));
    if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(2000);
    }

    const modalVisible = await page.locator('#new_service_modal').isVisible().catch(() => false);
    console.log('Is #new_service_modal visible?:', modalVisible);

    if (modalVisible) {
        // Visual time selection on #temp_service_hora_inicio:
        const startInput = page.locator('#temp_service_hora_inicio');
        await startInput.click({ force: true });
        await page.waitForTimeout(1000);

        const widgetInfo = await page.evaluate(() => {
            const w = document.querySelector('.bootstrap-datetimepicker-widget:not([style*="display: none"]), .bootstrap-datetimepicker-widget');
            if (!w) return 'no widget';
            return {
                classes: w.className,
                html: w.innerHTML.slice(0, 500)
            };
        });

        console.log('WIDGET INFO:\n', JSON.stringify(widgetInfo, null, 2));
    }

    await context.close();
}

main().catch(console.error);
