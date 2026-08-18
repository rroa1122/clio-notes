const { chromium } = require('playwright');

async function main() {
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = (await context.pages())[0] || await context.newPage();

    try {
        await page.goto('https://www.amexzone.com/patients', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        const inputs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
                tag: el.tagName,
                id: el.id,
                name: el.name,
                type: el.type,
                placeholder: el.placeholder,
                className: el.className,
                innerText: el.innerText
            }));
        });
        console.log("INPUTS FOUND ON PAGE:", JSON.stringify(inputs, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await context.close();
    }
}

main();
