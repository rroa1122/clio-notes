const { chromium } = require('playwright');
const path = require('path');

async function main() {
    const userDataDir = '/root/amexzone-notes-bot/user_data_provider_e032c040-5a32-41c3-be83-43d28eda7db0';
    console.log("Launching persistent context from disk...");
    const context = await chromium.launchPersistentContext(userDataDir, { headless: true });
    const cookies = await context.cookies();
    console.log("Cookies on disk:", cookies.map(c => ({ name: c.name, value: c.value.substring(0, 15) + '...', expires: c.expires })));
    await context.close();
}
main().catch(console.error);
