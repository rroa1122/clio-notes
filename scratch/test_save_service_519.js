const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    page.on('request', req => {
        if (req.method() === 'POST') {
            console.log('📡 POST REQ:', req.url());
            console.log('📡 POST BODY:', req.postData()?.slice(0, 300));
        }
    });

    page.on('response', async res => {
        if (res.request().method() === 'POST') {
            try {
                const txt = await res.text();
                console.log('📥 POST RESP (' + res.status() + '):', txt.slice(0, 300));
            } catch (e) {}
        }
    });

    await page.goto('https://www.amexzone.com/attend/appointment/1585658', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(3000);
    }

    // Open EDIT SERVICE modal
    const editBtn = page.locator('a:has-text("EDITAR SERVICIO"), a:has-text("EDIT SERVICE"), button:has-text("EDIT SERVICE"), button:has-text("EDITAR SERVICIO")').first();
    if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(2000);
    }

    // Set time in modal using jQuery and DOM
    await page.evaluate(() => {
        const jQ = window.jQuery;
        const startInp = document.querySelector('#temp_service_hora_inicio');
        const endInp = document.querySelector('#temp_service_hora_fin');
        const durInp = document.querySelector('#temp_service_duracion_mins');
        const placeInp = document.querySelector('#temp_service_place');

        if (startInp) {
            startInp.value = '05:19 PM';
            startInp.dispatchEvent(new Event('input', { bubbles: true }));
            startInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (jQ) {
                const $st = jQ(startInp);
                $st.val('05:19 PM').trigger('change').trigger('input').trigger('dp.change');
                const dtp = $st.data('DateTimePicker');
                if (dtp && window.moment) {
                    const m = window.moment('05:19 PM', ['hh:mm A', 'h:mm A']);
                    if (m.isValid()) dtp.date(m);
                }
            }
        }

        if (endInp) {
            endInp.value = '06:19 PM';
            endInp.dispatchEvent(new Event('input', { bubbles: true }));
            endInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (jQ) {
                const $et = jQ(endInp);
                $et.val('06:19 PM').trigger('change').trigger('input').trigger('dp.change');
                const dtp = $et.data('DateTimePicker');
                if (dtp && window.moment) {
                    const m = window.moment('06:19 PM', ['hh:mm A', 'h:mm A']);
                    if (m.isValid()) dtp.date(m);
                }
            }
        }

        if (durInp) {
            durInp.value = '60';
            durInp.dispatchEvent(new Event('input', { bubbles: true }));
            durInp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (placeInp) {
            placeInp.value = 'home_visit';
            placeInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (jQ) jQ(placeInp).val('home_visit').trigger('change');
        }
    });

    await page.waitForTimeout(1000);

    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = page.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    // Click GUARDAR CAMBIOS (Save changes) on encounter page
    const saveChangesBtn = page.locator('button:has-text("GUARDAR CAMBIOS"), a:has-text("GUARDAR CAMBIOS"), button:has-text("SAVE CHANGES"), a:has-text("SAVE CHANGES")').first();
    if (await saveChangesBtn.isVisible()) {
        console.log('👆 Haciendo clic en GUARDAR CAMBIOS...');
        await saveChangesBtn.click({ force: true });
        await page.waitForTimeout(4000);
    }

    const finalState = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tarea = vm?.citas?.[citaKey]?.tareas?.[0];
        return {
            tarea_hora_inicio: tarea?.hora_inicio,
            tarea_hora_fin: tarea?.hora_fin,
            tarea_duracion: tarea?.duracion_mins,
            tarea_place: tarea?.place
        };
    });

    console.log('FINAL VUE STATE:\n', JSON.stringify(finalState, null, 2));
    await context.close();
}

main().catch(console.error);
