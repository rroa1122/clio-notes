const { chromium } = require('playwright');

const accounts = [
    { id: 'c630d8ae-2c39-4760-99f3-88ae4a824f92', email: 'aitanamsinc@gmail.com', pin: '1206' },
    { id: 'e032c040-5a32-41c3-be83-43d28eda7db0', email: 'Edmundoarc@yahoo.com', pin: '1004' },
    { id: 'd460d9ea-59a7-4f7c-b6ac-c0bbe2a9b108', email: 'claudiamleyvam@gmail.com', pin: '1974' },
    { id: '827e4ff6-c085-4f0a-a2b7-66cba265a8d7', email: 'alegidos@arcmentalhealth.com (1)', pin: '1206' },
    { id: '1d7a459e-0ad9-4208-bd71-23b48ef7e0a6', email: 'alegidos@arcmentalhealth.com (2)', pin: '1206' }
];

async function checkAccount(acc) {
    console.log(`\n========================================`);
    console.log(`Checking account: ${acc.email} (${acc.id})`);
    console.log(`========================================`);
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${acc.id}`;

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = (await context.pages())[0] || await context.newPage();

    try {
        await page.goto('https://www.amexzone.com/patients', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        // PIN entry
        const pinInput = page.locator('textarea#access_code, #access_code, input#access_code').first();
        if (await pinInput.isVisible()) {
            console.log("Entering PIN...");
            await pinInput.fill(acc.pin);
            await page.waitForTimeout(1000);
            const entrarBtn = page.locator('#entrar_access_code_btn, button:has-text("ENTER"), button:has-text("Entrar"), .btn-success').first();
            if (await entrarBtn.isVisible()) {
                await entrarBtn.click();
            } else {
                await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(4000);
        }

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
            await page.waitForTimeout(500);
            await page.keyboard.type('Perurena');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000);

            const matches = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('table tbody tr a'));
                const patientInfoLinks = links.filter(l => l.href && (l.href.includes('/patient/info') || l.href.includes('/patient/documentation/fill/')));
                return patientInfoLinks.map(l => l.innerText.trim());
            });

            console.log(`MATCHES FOUND for ${acc.email}:`, matches);
        } else {
            console.log("Search input is NOT visible!");
        }

    } catch (e) {
        console.error(`Error checking ${acc.email}:`, e.message);
    } finally {
        await context.close();
    }
}

async function main() {
    for (const acc of accounts) {
        try {
            await checkAccount(acc);
        } catch (err) {
            console.error(err);
        }
    }
}

main();
