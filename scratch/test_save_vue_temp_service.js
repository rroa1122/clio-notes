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
            console.log('📡 POST /saveCitaServicio BODY:', req.postData());
        }
    });

    page.on('response', async res => {
        if (res.url().includes('saveCitaServicio')) {
            console.log('📥 POST /saveCitaServicio RESP:', await res.text());
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

    // Click EDIT SERVICE
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    await page.waitForTimeout(1000);

    // Set temp_service fields directly on Vue instance and DOM
    await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        if (!vm) return 'no vm';

        if (vm.temp_service) {
            vm.$set(vm.temp_service, 'name_en', 'Transportation Coordination for Depressed Client to Preserve Treatment Access');
            vm.$set(vm.temp_service, 'name_es', 'Transportation Coordination for Depressed Client to Preserve Treatment Access');
            vm.$set(vm.temp_service, 'hora_inicio', '17:19:00');
            vm.$set(vm.temp_service, 'hora_fin', '18:19:00');
            vm.$set(vm.temp_service, 'duracion_mins', 60);
            vm.$set(vm.temp_service, 'place', 'home_visit');
        }

        const startInp = document.querySelector('#temp_service_hora_inicio');
        const endInp = document.querySelector('#temp_service_hora_fin');
        const durInp = document.querySelector('#temp_service_duracion_mins');
        const placeInp = document.querySelector('#temp_service_place');

        if (startInp) startInp.value = '05:19 PM';
        if (endInp) endInp.value = '06:19 PM';
        if (durInp) durInp.value = '60';
        if (placeInp) placeInp.value = 'home_visit';
    });

    await page.waitForTimeout(500);

    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = page.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    const finalState = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tarea = vm?.citas?.[citaKey]?.tareas?.[0];
        return {
            tarea_hora_inicio: tarea?.hora_inicio,
            tarea_hora_fin: tarea?.hora_fin,
            tarea_duracion: tarea?.duracion_mins,
            tarea_place: tarea?.place
        };
    });

    console.log('FINAL VUE STATE AFTER PROPER SAVE:\n', JSON.stringify(finalState, null, 2));

    await context.close();
}

main().catch(console.error);
