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

    await page.goto('https://www.amexzone.com/attend/appointment/1585766', { waitUntil: 'load' });
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

    const initialTemp = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        return {
            temp_service: Object.assign({}, vm?.temp_service)
        };
    });
    console.log('INITIAL temp_service in Vue:\n', JSON.stringify(initialTemp, null, 2));

    // Test setting 12h vs 24h format in temp_service
    await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const jQ = window.jQuery;

        // Set 12h format directly on DateTimePicker
        const $st = jQ('#temp_service_hora_inicio');
        const $et = jQ('#temp_service_hora_fin');

        $st.data('DateTimePicker').date(window.moment('05:25 PM', 'hh:mm A'));
        $et.data('DateTimePicker').date(window.moment('06:25 PM', 'hh:mm A'));
        
        jQ('#temp_service_duracion_mins').val('60').trigger('change').trigger('input');
        jQ('#temp_service_place').val('home_visit').trigger('change');
    });

    await page.waitForTimeout(1000);

    const afterDtpTemp = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        return {
            temp_service: Object.assign({}, vm?.temp_service),
            inp_inicio: document.querySelector('#temp_service_hora_inicio')?.value,
            inp_fin: document.querySelector('#temp_service_hora_fin')?.value
        };
    });
    console.log('AFTER DateTimePicker .date() update:\n', JSON.stringify(afterDtpTemp, null, 2));

    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = page.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    await context.close();
}

main().catch(console.error);
