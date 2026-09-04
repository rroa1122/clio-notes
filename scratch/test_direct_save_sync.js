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
        if (req.url().includes('saveCitaServicio')) {
            console.log('📡 POST /saveCitaServicio DATA:\n', req.postData());
        }
    });

    page.on('response', async res => {
        if (res.request().url().includes('saveCitaServicio')) {
            console.log('📥 POST /saveCitaServicio RESPONSE:\n', await res.text());
        }
    });

    await page.goto('https://www.amexzone.com/attend/appointment/1593889', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    // Dismiss overlay / take over
    await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        if (vm) {
            if (typeof vm.takeoverEditLock === 'function') vm.takeoverEditLock();
            if (typeof vm.editLockFailOpen === 'function') vm.editLockFailOpen();
        }
    });

    // Click EDIT SERVICE
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    await page.waitForTimeout(1000);

    // Update Vue state + jQuery DateTimePicker + DOM input values
    const result = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        
        // 1. Update DOM inputs
        const startInput = document.querySelector('#temp_service_hora_inicio');
        const endInput = document.querySelector('#temp_service_hora_fin');
        if (startInput) startInput.value = '12:45 PM';
        if (endInput) endInput.value = '01:45 PM';

        // 2. Update jQuery DateTimePicker
        if (window.jQuery && window.moment) {
            const dtp1 = window.jQuery('#temp_service_hora_inicio').data('DateTimePicker');
            if (dtp1) dtp1.date(window.moment('12:45 PM', ['hh:mm A', 'h:mm A', 'HH:mm']));
            
            const dtp2 = window.jQuery('#temp_service_hora_fin').data('DateTimePicker');
            if (dtp2) dtp2.date(window.moment('01:45 PM', ['hh:mm A', 'h:mm A', 'HH:mm']));
        }

        // 3. Update Vue temp_service model
        if (vm && vm.temp_service) {
            vm.$set(vm.temp_service, 'hora_inicio', '12:45:00');
            vm.$set(vm.temp_service, 'hora_fin', '13:45:00');
            vm.$set(vm.temp_service, 'duracion_mins', 60);
            vm.$set(vm.temp_service, 'place', 'home_visit');
        }

        return {
            temp_service_hora_inicio: vm?.temp_service?.hora_inicio,
            temp_service_hora_fin: vm?.temp_service?.hora_fin
        };
    });

    console.log('SYNCED STATE BEFORE SAVE:\n', JSON.stringify(result, null, 2));

    console.log('👆 Clicking #save_service_btn...');
    const saveBtn = page.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(3000);

    // Click SAVE CHANGES
    const saveChangesBtn = page.locator('button:has-text("GUARDAR CAMBIOS"), a:has-text("GUARDAR CAMBIOS"), a.info_pulse').first();
    if (await saveChangesBtn.isVisible()) {
        console.log('👆 Clicking GUARDAR CAMBIOS...');
        await saveChangesBtn.click({ force: true });
        await page.waitForTimeout(3000);
    }

    const finalState = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const cita = vm?.citas?.[citaKey];
        const tarea = cita?.tareas?.[0];
        return {
            cita_hora_inicio: cita?.hora_inicio,
            cita_hora_fin: cita?.hora_fin,
            tarea_hora_inicio: tarea?.hora_inicio,
            tarea_hora_fin: tarea?.hora_fin
        };
    });

    console.log('FINAL STATE IN APPOINTMENT:\n', JSON.stringify(finalState, null, 2));
    await context.close();
}

main().catch(console.error);
