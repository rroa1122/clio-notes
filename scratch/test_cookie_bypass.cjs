const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const path = require('path');
global.WebSocket = require('ws');
const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Check Edmundo's session cookies!
    const { data: integration, error } = await supabase
        .from('provider_integrations')
        .select('session_cookies')
        .eq('user_id', 'c630d8ae-2c39-4760-99f3-88ae4a824f92')
        .maybeSingle();
        
    if (error || !integration || !integration.session_cookies) {
        console.error("Failed to load cookies from DB:", error);
        return;
    }
    
    console.log(`Loaded ${integration.session_cookies.length} cookies from Supabase.`);
    
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
    
    console.log("Launching fresh browser context...");
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext();
    
    console.log("Injecting cookies into context...");
    await context.addCookies(integration.session_cookies);
    
    const page = await context.newPage();
    
    try {
        console.log("Navigating to patients page...");
        await page.goto("https://www.amexzone.com/patients", { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        console.log("Final URL:", page.url());
        await page.screenshot({ path: 'scratch/cookie_bypass_result_edmundo.png' });
        
        const bodyText = await page.innerText('body').catch(() => '');
        console.log("Body contains 'Pacientes' or similar:", bodyText.toLowerCase().includes('paciente') || bodyText.toLowerCase().includes('patient'));
    } catch (e) {
        console.error("Navigation failed:", e.message);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
