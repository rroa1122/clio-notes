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

    const citasTab = page.locator('a:has-text("Citas"), a:has-text("Appointments")').first();
    if (await citasTab.isVisible()) await citasTab.click();
    await page.waitForTimeout(2000);

    const nuevaCitaBtn = page.locator('button:has-text("Nueva Cita"), a:has-text("Nueva Cita"), button:has-text("New Appointment"), a:has-text("New Appointment")').first();
    if (await nuevaCitaBtn.isVisible()) await nuevaCitaBtn.click();
    await page.waitForTimeout(2000);

    const htmlMatches = await page.evaluate(() => {
        const matches = [];
        const m = document.querySelector('#gestion_cita_modal');
        if (!m) return 'no modal';
        
        // Find all elements containing text or attributes related to time
        Array.from(m.querySelectorAll('*')).forEach(el => {
            if (/hora|time|inicio|8:00|08:00/i.test(el.innerText || '') || /hora|time|inicio/i.test(el.outerHTML || '')) {
                matches.push({
                    tag: el.tagName,
                    id: el.id,
                    className: el.className,
                    outerHtml: el.outerHTML.slice(0, 200)
                });
            }
        });
        return matches;
    });

    console.log('TIME RELATED ELEMENTS IN GESTION CITA MODAL:\n', JSON.stringify(htmlMatches, null, 2));

    await context.close();
}

main().catch(console.error);
