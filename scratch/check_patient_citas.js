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

    const allCitas = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr, .cita_row, .table tbody tr'));
        return rows.map(r => r.innerText.replace(/\s+/g, ' ').trim()).filter(t => t.includes('2026') || t.includes('PN'));
    });

    console.log('ALL CITAS FOR PATIENT 27510:\n', JSON.stringify(allCitas, null, 2));

    // Also check encounter 1585658 directly
    await page.goto('https://www.amexzone.com/attend/appointment/1585658', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const encInfo = await page.evaluate(() => {
        const header = document.querySelector('.main-content, .card-body, body')?.innerText || '';
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const tarea = vm?.citas?.[citaKey]?.tareas?.[0];
        return {
            title: document.title,
            headerSnippet: header.slice(0, 500),
            tarea_hora_inicio: tarea?.hora_inicio,
            tarea_hora_fin: tarea?.hora_fin,
            tarea_duracion: tarea?.duracion_mins,
            tarea_place: tarea?.place
        };
    });

    console.log('ENCOUNTER 1585658 DETAILS:\n', JSON.stringify(encInfo, null, 2));

    await context.close();
}

main().catch(console.error);
