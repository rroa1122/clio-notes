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

    // Open EDIT SERVICE modal
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    // Click on start time input to open the visual picker
    const startInp = page.locator('#temp_service_hora_inicio');
    await startInp.click();
    await page.waitForTimeout(1000);

    const widgetInfo = await page.evaluate(() => {
        const w = document.querySelector('.bootstrap-datetimepicker-widget:not([style*="display: none"]), .bootstrap-datetimepicker-widget');
        if (!w) return 'no widget';
        return {
            classes: w.className,
            html: w.innerHTML,
            hours: Array.from(w.querySelectorAll('td[data-action="selectHour"], .hour')).map(h => h.innerText),
            minutes: Array.from(w.querySelectorAll('td[data-action="selectMinute"], .minute')).map(m => m.innerText),
            buttons: Array.from(w.querySelectorAll('button, span, a')).map(b => ({
                text: b.innerText,
                action: b.getAttribute('data-action')
            }))
        };
    });

    console.log('DATETIMEPICKER WIDGET INFO:\n', JSON.stringify(widgetInfo, null, 2));
    await context.close();
}

main().catch(console.error);
