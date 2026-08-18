const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92'; // Reinier's user ID
    const pin = '1206';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;

    console.log("Launching browser with userDataDir:", userDataDir);
    const launchOptions = {
        headless: true,
        viewport: { width: 1366, height: 768 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    const context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    const pages = context.pages();
    const page = pages[0] || await context.newPage();

    try {
        console.log("Navigating to Amexzone patients page...");
        await page.goto("https://www.amexzone.com/patients", { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        // Check PIN
        const pinInput = page.locator('input[type="password"], input[name="pin"], #pin_code').first();
        if (await pinInput.isVisible()) {
            console.log("Entering PIN...");
            await pinInput.fill(pin);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000);
        }

        // Take initial screenshot of patients list
        console.log("Taking screenshot of initial patients list...");
        await page.screenshot({ path: '/root/amexzone-notes-bot/scratch/initial_list.png' });

        // Search input
        console.log("Looking for search input...");
        let searchInput = page.locator('div').filter({ has: page.locator('h6', { hasText: /^Nombre$|^Name$/i }) }).locator('input[type="text"]').first();
        if (!await searchInput.isVisible().catch(() => false)) {
            searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[name*="search"], #search_patient, .dataTables_filter input, input[type="text"]').first();
        }

        if (await searchInput.isVisible()) {
            console.log("Search input is visible. Searching for 'Perurena'...");
            await searchInput.click();
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.keyboard.type('Perurena');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(5000);

            console.log("Taking screenshot of search result...");
            await page.screenshot({ path: '/root/amexzone-notes-bot/scratch/search_result.png' });

            const pageText = await page.evaluate(() => document.body.innerText);
            console.log("Page Text (Partial):", pageText.slice(0, 1000));
        } else {
            console.log("Search input is NOT visible!");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await context.close();
    }
}

main();
