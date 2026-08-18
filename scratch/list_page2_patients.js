const { chromium } = require('playwright');

async function main() {
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const pin = '1206';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;

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

        // List page 1
        const page1Names = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('table tbody tr a'));
            const patientInfoLinks = links.filter(l => l.href && (l.href.includes('/patient/info') || l.href.includes('/patient/documentation/fill/')));
            return patientInfoLinks.map(l => l.innerText.trim());
        });
        console.log(`PAGE 1 PATIENTS (${page1Names.length}):`, page1Names);

        // Click next page
        const nextButton = page.locator('a:has-text("Next"), button:has-text("Next"), .page-item.next a, a.next').first();
        if (await nextButton.isVisible()) {
            console.log("Clicking Next button...");
            await nextButton.click();
            await page.waitForTimeout(4000);

            // List page 2
            const page2Names = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('table tbody tr a'));
                const patientInfoLinks = links.filter(l => l.href && (l.href.includes('/patient/info') || l.href.includes('/patient/documentation/fill/')));
                return patientInfoLinks.map(l => l.innerText.trim());
            });
            console.log(`PAGE 2 PATIENTS (${page2Names.length}):`, page2Names);
        } else {
            console.log("Next button is not visible!");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await context.close();
    }
}

main();
