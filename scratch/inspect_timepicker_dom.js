const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1585805', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    // Dismiss any Notiflix or overlay
    await page.evaluate(() => {
        const closeBtn = document.querySelector('#NotiflixReportWrap button, #NotiflixConfirmWrap button, .notiflix-confirm-button');
        if (closeBtn) closeBtn.click();
    });
    await page.waitForTimeout(1000);

    // Click EDIT SERVICE
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // Click on #temp_service_hora_inicio
    const startInp = page.locator('#temp_service_hora_inicio');
    await startInp.click();
    await page.waitForTimeout(1000);

    // Inspect the exact HTML structure of the open timepicker widget
    const widgetHtml = await page.evaluate(() => {
        const w = document.querySelector('.bootstrap-datetimepicker-widget:not([style*="display: none"]), div[class*="datetimepicker"]:not([style*="display: none"]), div[class*="timepicker"]:not([style*="display: none"])');
        if (!w) return 'widget not found in DOM';
        
        // Find all clickable elements in widget
        const clickables = Array.from(w.querySelectorAll('*')).filter(el => {
            const txt = (el.innerText || '').trim();
            return txt && el.children.length === 0;
        }).map(el => ({
            tag: el.tagName,
            className: el.className,
            action: el.getAttribute('data-action'),
            text: el.innerText.trim()
        }));

        return {
            widgetClass: w.className,
            widgetOuterHtml: w.outerHTML,
            clickables
        };
    });

    console.log('TIMEPICKER WIDGET DETAILS:\n', JSON.stringify(widgetHtml, null, 2));
    await context.close();
}

main().catch(console.error);
