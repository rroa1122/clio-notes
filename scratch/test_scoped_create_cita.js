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

    // Click Nueva Cita
    const nuevaCitaBtn = page.locator('button:has-text("Nueva Cita"), a:has-text("Nueva Cita"), button:has-text("New Appointment"), a:has-text("New Appointment")').first();
    if (await nuevaCitaBtn.isVisible()) await nuevaCitaBtn.click();
    await page.waitForTimeout(2000);

    // Intercept all requests
    page.on('request', req => {
        if (req.method() === 'POST') {
            console.log('📡 POST URL:', req.url());
            console.log('📡 POST DATA:', req.postData());
        }
    });

    page.on('response', async res => {
        if (res.request().method() === 'POST') {
            try {
                const txt = await res.text();
                console.log('📥 STATUS (' + res.status() + '):', txt.slice(0, 300));
            } catch (e) {}
        }
    });

    // Inspect and set form fields inside #gestion_cita_modal specifically
    const modalFound = await page.evaluate(() => {
        const modal = document.querySelector('#gestion_cita_modal');
        if (!modal) return 'no modal';

        const jQ = window.jQuery;
        if (!jQ) return 'no jquery';

        // 1. Patient
        const pSel = jQ(modal).find('#cita_paciente_id');
        if (pSel.length) {
            if (!pSel.find('option[value="27510"]').length) {
                pSel.append(new Option('Testthiago Six', '27510', true, true));
            }
            pSel.val('27510').trigger('change');
        }

        // 2. Case Manager Worker
        const cmSel = jQ(modal).find('#cita_trabajador_id');
        if (cmSel.length) cmSel.val('473').trigger('change');

        // 3. Place of service: 12 - Home -> home_visit
        const placeSel = jQ(modal).find('#cita_place');
        if (placeSel.length) {
            placeSel.val('home_visit').trigger('change');
        }

        // 4. Duration
        const durInp = jQ(modal).find('#cita_duracion_mins');
        if (durInp.length) {
            durInp.val('60').trigger('change').trigger('input');
        }

        // 5. Date & Time
        const dtInp = jQ(modal).find('#cita_fecha_hora');
        if (dtInp.length) {
            dtInp.removeAttr('readonly');
            dtInp.val('1 de agosto de 2026 10:00 AM');
            const drp = dtInp.data('daterangepicker');
            if (drp && window.moment) {
                const m = window.moment('2026-08-01 10:00 AM', 'YYYY-MM-DD hh:mm A');
                if (m.isValid()) {
                    drp.startDate = m.clone();
                    drp.endDate = m.clone();
                    if (typeof drp.updateElement === 'function') drp.updateElement();
                }
            }
            dtInp.val('1 de agosto de 2026 10:00 AM').trigger('change').trigger('input');
        }

        return {
            patient: pSel.val(),
            worker: cmSel.val(),
            place: placeSel.val(),
            dur: durInp.val(),
            dt: dtInp.val()
        };
    });

    console.log('MODAL FIELDS SET:\n', JSON.stringify(modalFound, null, 2));

    await page.waitForTimeout(1000);

    console.log('👆 Haciendo clic en #save_cita_btn...');
    const saveBtn = page.locator('#save_cita_btn, #gestion_cita_modal button:has-text("Guardar")').first();
    await saveBtn.click({ force: true });
    await page.waitForTimeout(5000);

    await context.close();
}

main().catch(console.error);
