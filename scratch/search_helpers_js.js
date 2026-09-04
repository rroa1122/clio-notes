const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/back/js/module_health_helpers.js?v=13', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const txt = await page.evaluate(() => document.body.innerText);
    
    // Find references to save_service_btn or temp_service_hora_inicio
    const lines = txt.split('\n').filter(l => l.includes('save_service_btn') || l.includes('temp_service') || l.includes('new_service_modal'));
    console.log('MATCHING LINES IN module_health_helpers.js:\n', lines.join('\n'));

    // Also look for $(document).on('click', '#save_service_btn' in the whole file
    const idx = txt.indexOf('save_service_btn');
    if (idx !== -1) {
        console.log('CONTEXT AROUND save_service_btn:\n', txt.slice(Math.max(0, idx - 200), idx + 800));
    }

    await context.close();
}

main().catch(console.error);
