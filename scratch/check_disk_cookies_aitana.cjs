const { chromium } = require('playwright');
const path = require('path');

async function main() {
    const userDataDir = '/root/amexzone-notes-bot/user_data_provider_c630d8ae-2c39-4760-99f3-88ae4a824f92';
    console.log("Launching persistent context from disk for Aitana...");
    const context = await chromium.launchPersistentContext(userDataDir, { headless: true });
    const cookies = await context.cookies();
    console.log("Aitana cookies on disk:", cookies.map(c => ({ name: c.name, value: c.value.substring(0, 15) + '...', expires: c.expires })));
    await context.close();
}
main().catch(console.error);
