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

    async function searchAndCheck(term) {
        let searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[name*="search"], #search_patient, .dataTables_filter input, input[type="text"]').first();
        await searchInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);
        await page.keyboard.type(term);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(4000);

        const text = await page.evaluate(() => document.body.innerText);
        const hasNerci = text.includes('AMH7242') || text.includes('Perurena');
        console.log(`Search "${term}": hasNerci=${hasNerci}`);
    }

    try {
        await page.goto('https://www.amexzone.com/patients', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        const pinInput = page.locator('input[type="password"], input[name="pin"], #pin_code').first();
        if (await pinInput.isVisible()) {
            await pinInput.fill(pin);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000);
        }

        await searchAndCheck('Nerci');
        await searchAndCheck('Perurena');
        await searchAndCheck('Artiles');
        await searchAndCheck('Nerci Perurena');
        await searchAndCheck('Nerci Perurena Artiles');

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await context.close();
    }
}

main();
