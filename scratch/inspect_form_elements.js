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

    const formHtml = await page.evaluate(() => {
        const form = document.querySelector('#gestion_cita_modal form, #gestion_cita_form, #form_gestion_cita') || document.querySelector('#gestion_cita_modal');
        if (!form) return 'no form';
        return {
            action: form.getAttribute('action'),
            method: form.getAttribute('method'),
            html: form.innerHTML
        };
    });

    console.log('FORM ACTION:', formHtml.action, 'METHOD:', formHtml.method);
    
    // Extract all input/select names & IDs from HTML
    const elements = await page.evaluate(() => {
        const m = document.querySelector('#gestion_cita_modal');
        if (!m) return [];
        return Array.from(m.querySelectorAll('input, select, textarea, button')).map(el => ({
            tag: el.tagName,
            id: el.id,
            name: el.name,
            type: el.type,
            value: el.value,
            classes: el.className,
            parentHtml: el.parentElement?.innerHTML?.slice(0, 200)
        }));
    });

    console.log('ALL MODAL ELEMENTS:\n', JSON.stringify(elements, null, 2));
    await context.close();
}

main().catch(console.error);
