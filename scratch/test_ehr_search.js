const { chromium } = require('playwright');

async function main() {
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const pin = '1206';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const pages = context.pages();
    const page = pages[0] || await context.newPage();

    try {
        await page.goto('https://www.amexzone.com/patients', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        const pinInput = page.locator('input[type="password"], input[name="pin"], #pin_code').first();
        if (await pinInput.isVisible()) {
            await pinInput.fill(pin);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000);
        }

        let searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[name*="search"], #search_patient, .dataTables_filter input, input[type="text"]').first();
        
        console.log("Searching for 'Nerci Perurena'...");
        await searchInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await searchInput.fill('Nerci Perurena');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        const text = await page.evaluate(() => document.body.innerText);
        console.log("PAGE TEXT AFTER SEARCH:", text.includes('Nerci') ? "FOUND NERCI" : "NOT FOUND NERCI");
        console.log("All text (first 500 chars):", text.slice(0, 500));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await context.close();
    }
}

main();
