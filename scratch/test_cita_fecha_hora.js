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

    // Set date and time: 1 de agosto de 2026 10:00 AM
    await page.evaluate(() => {
        const inp = document.querySelector('#cita_fecha_hora');
        const formatted = '1 de agosto de 2026 10:00 AM';
        if (inp) {
            inp.removeAttribute('readonly');
            inp.value = formatted;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            
            if (window.jQuery) {
                const jQ = window.jQuery;
                jQ(inp).val(formatted).trigger('change').trigger('input');
                const drp = jQ(inp).data('daterangepicker');
                if (drp && window.moment) {
                    const m = window.moment('2026-08-01 10:00 AM', 'YYYY-MM-DD hh:mm A');
                    if (m.isValid()) {
                        drp.setStartDate(m);
                        drp.setEndDate(m);
                    }
                }
            }
        }

        // Set POS: 12 - Home -> home_visit
        const placeSel = document.querySelector('#cita_place');
        if (placeSel) {
            placeSel.value = 'home_visit';
            placeSel.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) window.jQuery(placeSel).val('home_visit').trigger('change');
        }

        // Set Duration: 60
        const durInp = document.querySelector('#cita_duracion_mins');
        if (durInp) {
            durInp.value = '60';
            durInp.dispatchEvent(new Event('input', { bubbles: true }));
            durInp.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
        return {
            fecha_hora: document.querySelector('#cita_fecha_hora')?.value,
            place: document.querySelector('#cita_place')?.value,
            duration: document.querySelector('#cita_duracion_mins')?.value
        };
    });

    console.log('FINAL VERIFIED VALUES IN MODAL:\n', JSON.stringify(result, null, 2));
    await context.close();
}

main().catch(console.error);
