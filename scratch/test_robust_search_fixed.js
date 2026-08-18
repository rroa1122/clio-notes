const { chromium } = require('playwright');
const path = require('path');

async function testForName(targetName) {
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const pin = '1206';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = (await context.pages())[0] || await context.newPage();

    try {
        console.log("Navigating to patients list...");
        await page.goto('https://www.amexzone.com/patients', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        // Robust PIN entry matching handlePin
        const pinInput = page.locator('textarea#access_code, #access_code, input#access_code').first();
        if (await pinInput.isVisible()) {
            console.log("Entering PIN...");
            await pinInput.fill(pin);
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

        // Search by last word
        const nameParts = targetName.trim().split(/\s+/);
        const searchWord = nameParts[nameParts.length - 1];
        console.log(`Searching for word: "${searchWord}" for target: "${targetName}"`);
        await searchInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);
        await page.keyboard.type(searchWord);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        await page.screenshot({ path: '/root/amexzone-notes-bot/scratch/robust_after_search.png' });

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

        const cleanTargetName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let selectedMatch = matches.find(m => {
            const cleanName = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanName.includes(cleanTargetName) || cleanTargetName.includes(cleanName);
        });

        if (selectedMatch) {
            console.log(`🎯 SUCCESS: Found patient match: "${selectedMatch.name}" (ID: ${selectedMatch.id})`);
        } else {
            console.log(`❌ FAILURE: Could not match patient: "${targetName}" in matches:`, JSON.stringify(matches, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await context.close();
    }
}

async function main() {
    console.log("=== Testing with 'Nerci Perurena' ===");
    await testForName('Nerci Perurena');
    console.log("\n=== Testing with 'Nerci Perurena Artiles' ===");
    await testForName('Nerci Perurena Artiles');
}

main();
