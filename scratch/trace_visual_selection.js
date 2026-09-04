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

    const modal = page.locator('#new_service_modal, #edit_service_modal, .modal.show').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });

    const selectVisualTime = async (inputSel, hTargetStr, mTargetStr, merTarget) => {
        console.log(`\n--- Setting ${inputSel} to ${hTargetStr}:${mTargetStr} ${merTarget} ---`);
        const input = modal.locator(inputSel).first();
        await input.click({ force: true });
        await page.waitForTimeout(300);

        const widget = page.locator('.bootstrap-datetimepicker-widget:visible').first();
        console.log('Widget visible:', await widget.isVisible());

        // 1. Hours
        const showH = widget.locator('span.timepicker-hour[data-action="showHours"]').first();
        if (await showH.isVisible()) {
            console.log('Clicking showHours...');
            await showH.click({ force: true });
            await page.waitForTimeout(200);
            const hourTd = widget.locator(`.timepicker-hours td[data-action="selectHour"]:has-text("${hTargetStr}")`).first();
            console.log(`Hour cell "${hTargetStr}" visible:`, await hourTd.isVisible());
            if (await hourTd.isVisible()) {
                await hourTd.click({ force: true });
                await page.waitForTimeout(200);
            }
        }

        // 2. Minutes
        const showM = widget.locator('span.timepicker-minute[data-action="showMinutes"]').first();
        if (await showM.isVisible()) {
            console.log('Clicking showMinutes...');
            await showM.click({ force: true });
            await page.waitForTimeout(200);
            const minTd = widget.locator(`.timepicker-minutes td[data-action="selectMinute"]:has-text("${mTargetStr}")`).first();
            console.log(`Minute cell "${mTargetStr}" visible:`, await minTd.isVisible());
            if (await minTd.isVisible()) {
                await minTd.click({ force: true });
                await page.waitForTimeout(200);
            }
        }

        // 3. Period
        const periodBtn = widget.locator('button[data-action="togglePeriod"]').first();
        if (await periodBtn.isVisible()) {
            const cur = (await periodBtn.innerText()).trim().toUpperCase();
            console.log(`Current period: "${cur}", target: "${merTarget}"`);
            if (cur !== merTarget.toUpperCase()) {
                await periodBtn.click({ force: true });
                await page.waitForTimeout(200);
            }
        }

        // Close popup
        await page.evaluate(() => {
            if (window.jQuery) window.jQuery('.bootstrap-datetimepicker-widget').hide();
        });
    };

    await selectVisualTime('#temp_service_hora_inicio', '12', '45', 'PM');
    await page.waitForTimeout(300);

    await selectVisualTime('#temp_service_hora_fin', '01', '45', 'PM');
    await page.waitForTimeout(300);

    const valuesBeforeSave = await page.evaluate(() => {
        return {
            startVal: document.querySelector('#temp_service_hora_inicio')?.value,
            endVal: document.querySelector('#temp_service_hora_fin')?.value
        };
    });
    console.log('\nVALUES IN DOM INPUTS BEFORE SAVE:', JSON.stringify(valuesBeforeSave, null, 2));

    console.log('👆 Clicking #save_service_btn...');
    const saveBtn = modal.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    // Save changes
    const saveChangesBtn = page.locator('button:has-text("GUARDAR CAMBIOS"), a:has-text("GUARDAR CAMBIOS"), a.info_pulse').first();
    if (await saveChangesBtn.isVisible()) {
        console.log('👆 Clicking GUARDAR CAMBIOS...');
        await saveChangesBtn.click({ force: true });
        await page.waitForTimeout(4000);
    }

    await context.close();
}

main().catch(console.error);
