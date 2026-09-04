const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1584935', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    // Intercept requests on save
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
                console.log('📥 RESPONSE (' + res.status() + '):', txt.slice(0, 300));
            } catch (e) {}
        }
    });

    // Open EDIT SERVICE modal
    const editBtn = page.locator('a:has-text("EDITAR SERVICIO"), a:has-text("EDIT SERVICE"), button:has-text("EDIT SERVICE"), button:has-text("EDITAR SERVICIO")').first();
    if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(2000);
    }

    // Set 10:00 AM - 11:00 AM, 60 mins, home_visit
    await page.evaluate(() => {
        const m = document.querySelector('#new_service_modal');
        if (!m) return;

        const startInp = m.querySelector('#temp_service_hora_inicio');
        const endInp = m.querySelector('#temp_service_hora_fin');
        const durInp = m.querySelector('#temp_service_duracion_mins');
        const placeSel = m.querySelector('#temp_service_place');

        if (startInp) {
            startInp.value = '10:00 AM';
            startInp.dispatchEvent(new Event('input', { bubbles: true }));
            startInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) {
                const $st = window.jQuery(startInp);
                $st.val('10:00 AM').trigger('change').trigger('input');
                const dtp = $st.data('DateTimePicker');
                if (dtp) {
                    const d = new Date(); d.setHours(10, 0, 0, 0);
                    try { dtp.date(d); } catch(e){}
                }
            }
        }

        if (endInp) {
            endInp.value = '11:00 AM';
            endInp.dispatchEvent(new Event('input', { bubbles: true }));
            endInp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) {
                const $et = window.jQuery(endInp);
                $et.val('11:00 AM').trigger('change').trigger('input');
                const dtp = $et.data('DateTimePicker');
                if (dtp) {
                    const d = new Date(); d.setHours(11, 0, 0, 0);
                    try { dtp.date(d); } catch(e){}
                }
            }
        }

        if (durInp) {
            durInp.value = '60';
            durInp.dispatchEvent(new Event('input', { bubbles: true }));
            durInp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (placeSel) {
            placeSel.value = 'home_visit';
            placeSel.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.jQuery) window.jQuery(placeSel).val('home_visit').trigger('change');
        }
    });

    await page.waitForTimeout(1000);

    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = page.locator('#save_service_btn').first();
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    // Check Vue data for this service
    const vueData = await page.evaluate(() => {
        const vueEl = document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content');
        const vm = vueEl?.__vue__;
        if (!vm) return 'no vm';
        const citaKey = Object.keys(vm.citas || {})[0];
        const tarea = vm.citas?.[citaKey]?.tareas?.[0];
        return {
            tarea_hora_inicio: tarea?.hora_inicio,
            tarea_hora_fin: tarea?.hora_fin,
            tarea_duracion_mins: tarea?.duracion_mins,
            tarea_place: tarea?.place
        };
    });

    console.log('VUE DATA AFTER SAVE:', JSON.stringify(vueData, null, 2));

    await context.close();
}

main().catch(console.error);
