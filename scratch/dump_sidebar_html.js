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

        // Dump HTML of the FILTERS panel
        const filtersHtml = await page.evaluate(() => {
            const filtersHeader = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.trim() === 'FILTERS');
            if (filtersHeader) {
                // Return parent container HTML
                let parent = filtersHeader.parentElement;
                while (parent && parent.tagName !== 'DIV') {
                    parent = parent.parentElement;
                }
                return parent ? parent.outerHTML : 'No div parent found';
            }
            return 'FILTERS header not found';
        });

        console.log("FILTERS HTML CONTEXT:");
        console.log(filtersHtml);

    } catch (e) {
        console.error(e);
    } finally {
        await context.close();
    }
}

main();
