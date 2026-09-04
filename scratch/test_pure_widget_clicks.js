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
        if (res.request().url().includes('saveCitaServicio')) {
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

    // Dismiss any Notiflix or overlay
    await page.evaluate(() => {
        const closeBtn = document.querySelector('#NotiflixReportWrap button, #NotiflixConfirmWrap button');
        if (closeBtn) closeBtn.click();
    });
    await page.waitForTimeout(1000);

    // Click EDIT SERVICE using evaluate
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => /EDIT SERVICE|EDITAR SERVICIO/i.test(el.innerText || ''));
        if (btn) btn.click();
    });
    
    const modal = page.locator('#new_service_modal, #edit_service_modal, .modal.show').first();
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Modal is open and visible.');

    // 1. Start Time
    const startInp = modal.locator('#temp_service_hora_inicio').first();
    await startInp.click();
    await page.waitForTimeout(400);

    const showH = page.locator('.bootstrap-datetimepicker-widget:visible [data-action="showHours"]').first();
    if (await showH.isVisible()) {
        await showH.click();
        await page.waitForTimeout(200);
        await page.locator('.bootstrap-datetimepicker-widget:visible td[data-action="selectHour"]').filter({ hasText: /^0?5$/ }).first().click();
        await page.waitForTimeout(200);
    }

    const showM = page.locator('.bootstrap-datetimepicker-widget:visible [data-action="showMinutes"]').first();
    if (await showM.isVisible()) {
        await showM.click();
        await page.waitForTimeout(200);
        await page.locator('.bootstrap-datetimepicker-widget:visible td[data-action="selectMinute"]').filter({ hasText: /^25$/ }).first().click();
        await page.waitForTimeout(200);
    }

    const toggleP = page.locator('.bootstrap-datetimepicker-widget:visible button[data-action="togglePeriod"]').first();
    if (await toggleP.isVisible()) {
        const txt = (await toggleP.innerText()).trim().toUpperCase();
        if (txt !== 'PM') await toggleP.click();
        await page.waitForTimeout(200);
    }

    // 2. End Time
    const endInp = modal.locator('#temp_service_hora_fin').first();
    await endInp.click();
    await page.waitForTimeout(400);

    const showH2 = page.locator('.bootstrap-datetimepicker-widget:visible [data-action="showHours"]').first();
    if (await showH2.isVisible()) {
        await showH2.click();
        await page.waitForTimeout(200);
        await page.locator('.bootstrap-datetimepicker-widget:visible td[data-action="selectHour"]').filter({ hasText: /^0?6$/ }).first().click();
        await page.waitForTimeout(200);
    }

    const showM2 = page.locator('.bootstrap-datetimepicker-widget:visible [data-action="showMinutes"]').first();
    if (await showM2.isVisible()) {
        await showM2.click();
        await page.waitForTimeout(200);
        await page.locator('.bootstrap-datetimepicker-widget:visible td[data-action="selectMinute"]').filter({ hasText: /^25$/ }).first().click();
        await page.waitForTimeout(200);
    }

    const toggleP2 = page.locator('.bootstrap-datetimepicker-widget:visible button[data-action="togglePeriod"]').first();
    if (await toggleP2.isVisible()) {
        const txt = (await toggleP2.innerText()).trim().toUpperCase();
        if (txt !== 'PM') await toggleP2.click();
        await page.waitForTimeout(200);
    }

    // Close any popup
    await page.evaluate(() => {
        if (window.jQuery) window.jQuery('.bootstrap-datetimepicker-widget').hide();
    });
    await page.waitForTimeout(300);

    const valuesBeforeSave = await page.evaluate(() => {
        return {
            startInp: document.querySelector('#temp_service_hora_inicio')?.value,
            endInp: document.querySelector('#temp_service_hora_fin')?.value
        };
    });
    console.log('VALUES BEFORE SAVE:\n', JSON.stringify(valuesBeforeSave, null, 2));

    console.log('👆 Haciendo clic en #save_service_btn...');
    const saveBtn = modal.locator('#save_service_btn');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(4000);

    await context.close();
}

main().catch(console.error);
