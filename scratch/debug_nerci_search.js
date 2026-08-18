const { chromium } = require('playwright');

async function main() {
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const pin = '1206';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const pages = context.pages();
    const page = pages[0] || await context.newPage();

    try {
        await page.goto('https://www.amexzone.com/patients', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        // Robust PIN entry
        const pinInputs = await page.$$('input[type="password"], input[name="pin"], #pin_code');
        if (pinInputs.length > 0) {
            console.log("Entering PIN...");
            for (const input of pinInputs) {
                if (await input.isVisible()) {
                    await input.click();
                    await input.fill(pin);
                    await page.waitForTimeout(1000);
                    await page.keyboard.press('Enter');
                    await page.waitForTimeout(4000);
                    break;
                }
            }
        }

        let searchInput = page.locator('div').filter({ has: page.locator('h6', { hasText: /^Nombre$|^Name$/i }) }).locator('input[type="text"]').first();
        if (!await searchInput.isVisible().catch(() => false)) {
            searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[name*="search"], #search_patient, .dataTables_filter input, input[type="text"]').first();
        }

        console.log("Searching for 'Nerci Perurena Artiles'...");
        await searchInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);
        await page.keyboard.type('Nerci Perurena Artiles');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        console.log("Evaluating matches...");
        const matches = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr, ul li, div.media'));
            return rows.map(row => {
                const links = Array.from(row.querySelectorAll('a'));
                const infoLink = links.find(l => l.href && (l.href.includes('/patient/info') || l.href.includes('/patient/documentation/fill/')));
                if (infoLink) {
                    const rowText = row.innerText || '';
                    let patientId = '';
                    if (infoLink.href.includes('id=')) {
                        patientId = infoLink.href.split('id=')[1];
                    } else {
                        const match = infoLink.href.match(/\/fill\/\d+\/(\d+)/);
                        if (match) {
                            patientId = match[1];
                        }
                    }
                    if (patientId) {
                        return {
                            name: infoLink.innerText.trim(),
                            url: `https://www.amexzone.com/patient/info?id=${patientId}`,
                            id: patientId,
                            fullText: rowText
                        };
                    }
                }
                return null;
            }).filter(p => p !== null);
        });

        console.log("MATCHES FOUND:", JSON.stringify(matches, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await context.close();
    }
}

main();
