const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
    const userDataDir = '/root/amexzone-notes-bot/user_data_provider_e032c040-5a32-41c3-be83-43d28eda7db0';
    console.log("Launching persistent browser context from disk...");
    
    const path = require('path');
    const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const env = {};
    envText.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        }
    });

    const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    if (env.PROXY_SERVER) {
        launchOptions.proxy = { server: env.PROXY_SERVER };
        if (env.PROXY_USERNAME) {
            launchOptions.proxy.username = env.PROXY_USERNAME;
            launchOptions.proxy.password = env.PROXY_PASSWORD;
        }
    }

    const context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    const page = context.pages()[0] || await context.newPage();
    
    try {
        console.log("Navigating to patients page...");
        await page.goto("https://www.amexzone.com/patients", { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(5000);
        console.log("Final URL:", page.url());
        
        const bodyText = await page.innerText('body').catch(() => '');
        console.log("Body contains 'Pacientes':", bodyText.toLowerCase().includes('paciente') || bodyText.toLowerCase().includes('patient'));
    } catch (e) {
        console.error("Navigation failed:", e.message);
    } finally {
        await context.close();
    }
}
main().catch(console.error);
