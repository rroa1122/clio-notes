global.WebSocket = require('ws');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// We load the environment variables from the bot's environment
require('dotenv').config({ path: '/root/amexzone-notes-bot/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const userId = 'd460d9ea-59a7-4f7c-b6ac-c0bbe2a9b108'; // Claudia's user ID
    
    // Fetch integration credentials
    let { data: integration, error: intError } = await supabase
        .rpc('get_decrypted_integration', { 
            target_user_id: userId,
            secret_key: 'clio_bot_secret_decryption_token_9823472'
        })
        .maybeSingle();

    if (intError || !integration) {
        console.log("Fallback to provider_integrations direct read...");
        const { data: fallbackIntegration } = await supabase
            .from('provider_integrations')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        if (fallbackIntegration) {
            integration = {
                amexzone_email: fallbackIntegration.amexzone_email,
                amexzone_password: fallbackIntegration.amexzone_password // Encrypted but we can read plaintext if we decrypt or read directly
            };
            // Decrypt password
            if (integration.amexzone_password && integration.amexzone_password.startsWith('ENCRYPTED:')) {
                const crypto = require('crypto');
                const cipherText = integration.amexzone_password.replace('ENCRYPTED:', '');
                const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.alloc(32, 'clio_secret_key_encryption_key_11'), Buffer.alloc(16, 0));
                let decrypted = decipher.update(cipherText, 'base64', 'utf8');
                decrypted += decipher.final('utf8');
                integration.amexzone_password = decrypted;
            }
        }
    }

    if (!integration || !integration.amexzone_email || !integration.amexzone_password) {
        console.error("Could not retrieve integration credentials.");
        process.exit(1);
    }

    console.log(`Diagnosing login for: ${integration.amexzone_email}`);
    
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}_diagnose`;
    
    // Clean old state
    if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = (await context.pages())[0] || await context.newPage();

    try {
        console.log("Navigating to login page...");
        await page.goto('https://www.amexzone.com/login', { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);

        const emailField = page.locator('input[name="email"], input[type="email"], #email').first();
        if (await emailField.isVisible()) {
            console.log("Filling credentials...");
            await emailField.fill(integration.amexzone_email);
            await page.locator('input[name="password"], input[type="password"], #password').first().fill(integration.amexzone_password);
            
            await page.screenshot({ path: '/root/amexzone-notes-bot/scratch/diagnose_login_filled.png' });
            
            console.log("Clicking submit...");
            await page.click('button:has-text("Entrar"), button[type="submit"]');
            await page.waitForTimeout(10000);
            
            console.log(`Current URL after click: ${page.url()}`);
            await page.screenshot({ path: '/root/amexzone-notes-bot/scratch/diagnose_login_result.png' });
            
            const bodyText = await page.innerText('body');
            console.log("Body text snippet:\n", bodyText.slice(0, 1000));
        } else {
            console.log("Email field is not visible!");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await context.close();
    }
}

main();
