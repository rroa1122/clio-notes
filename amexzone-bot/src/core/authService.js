const path = require('path');
const { supabase } = require('../config/supabase');
const { handlePin, refreshSessionCookies } = require('./sessionManager');
const { launchBrowserContext, setupPageInterceptors } = require('./browser');

const performAmexzoneLogin = async (page, context, userId, pin, integration) => {
    console.log("🔑 [Autologin] Iniciando autenticación automática en Amexzone...");
    
    // 1. Fill email / password if on login page
    const emailField = page.locator('#login_form input[type="email"], form[action*="login"] input[name="email"], input#email[autocomplete="username"], input[type="email"]').first();
    let sendSmsRadio = page.locator('#send_code_by_sms, input[value="phone"], input[value="sms"], input[type="radio"]').nth(1);
    let codeInput = page.locator('input[type="text"], input[type="number"], input[name*="code"], input[id*="code"], input[placeholder*="código"]').first();

    await Promise.race([
        emailField.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
        sendSmsRadio.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
        codeInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
    ]).catch(() => {});

    if (await emailField.isVisible()) {
        console.log(`🔑 [Autologin] Rellenando credenciales para: ${integration.amexzone_email}`);
        await emailField.fill(integration.amexzone_email);
        await page.locator('input[name="password"], input[type="password"], #password').first().fill(integration.amexzone_password);
        
        // Marcar "Recordar sesión / Remember Me"
        try {
            const rememberCheckbox = page.locator('input[name="remember"], #remember, input[type="checkbox"]').first();
            if (await rememberCheckbox.isVisible().catch(() => false)) {
                await rememberCheckbox.check({ force: true }).catch(() => {});
                console.log("   ✅ Checked 'Remember Me' on login form.");
            }
        } catch (e) {}

        await page.click('button:has-text("Entrar"), button[type="submit"]');
        await page.waitForTimeout(4000);

        // Check for immediate login errors on page
        const errorMsgLocator = page.locator('.alert-danger, .invalid-feedback, text=/These credentials do not match/i, text=/Credenciales inválidas/i, text=/The password you entered is incorrect/i').first();
        if (await errorMsgLocator.isVisible().catch(() => false)) {
            const errorText = await errorMsgLocator.innerText().catch(() => 'Credenciales inválidas de Amexzone.');
            console.error(`❌ [Autologin] Error de autenticación en Amexzone: ${errorText}`);
            await supabase.from('provider_integrations').update({ mfa_status: 'not_connected', mfa_code: null }).eq('user_id', userId);
            throw new Error(`Amexzone: ${errorText.trim()}`);
        }

        await handlePin(page, pin);
    }

    // 2. 2FA Method Selection
    let currentUrl = page.url();
    sendSmsRadio = page.locator('#send_code_by_sms, input[value="phone"], input[value="sms"], input[type="radio"]').nth(1);
    let sendEmailRadio = page.locator('#send_code_by_email, input[value="email"], input[type="radio"]').first();
    let is2faSelectionPage = currentUrl.includes('/two-factor-authentication') || currentUrl.includes('/two-factor') || await sendSmsRadio.isVisible() || await sendEmailRadio.isVisible();
    
    if (is2faSelectionPage) {
        const channel = integration.mfa_channel || 'sms';
        console.log(`🔘 [Autologin] Pantalla de selección de 2FA detectada. Solicitando envío de código por ${channel.toUpperCase()}...`);
        
        let targetRadio;
        if (channel === 'email') {
            targetRadio = page.locator('#send_code_by_email, input[value="email"]').first();
        } else {
            targetRadio = page.locator('#send_code_by_sms, input[value="phone"], input[value="sms"]').first();
        }

        try {
            await targetRadio.waitFor({ state: 'visible', timeout: 10000 });
        } catch (e) {
            console.log("   ⚠️ Timeout waiting for specific radio button, falling back to type radio locator...");
            if (channel === 'email') {
                targetRadio = page.locator('input[type="radio"]').first();
            } else {
                targetRadio = page.locator('input[type="radio"]').nth(1);
            }
        }

        if (await targetRadio.isVisible()) {
            await targetRadio.check({ force: true });
            console.log(`   ✅ Checked radio input for ${channel.toUpperCase()} successfully.`);
            await page.waitForTimeout(1000);
            
            const sendCodeBtn = page.locator('button:has-text("Send Verification Code"), button:has-text("Enviar Código"), button:has-text("Verification"), button:has-text("Verificación"), .btn-primary').first();
            try {
                await sendCodeBtn.waitFor({ state: 'visible', timeout: 5000 });
            } catch (e) {}

            await sendCodeBtn.click();
            console.log("   ✅ Submitted 2FA send code button.");
            await page.waitForTimeout(5000);
        }
    }

    // 3. 2FA Code Input
    currentUrl = page.url();
    codeInput = page.locator('input[type="text"], input[type="number"], input[name*="code"], input[id*="code"], input[placeholder*="código"]').first();
    const isCodeInputPage = currentUrl.includes('/verification') || currentUrl.includes('/verify') || await codeInput.isVisible();

    if (isCodeInputPage) {
        const channel = integration.mfa_channel || 'sms';
        console.log(`🔒 [Autologin] Se requiere ingresar el código de ${channel.toUpperCase()}. Verificando disponibilidad de código en Clio...`);
        
        let mfaCodeFromDb = integration.mfa_code || null;
        
        if (!mfaCodeFromDb) {
            const { data: freshInt } = await supabase
                .from('provider_integrations')
                .select('mfa_code')
                .eq('user_id', userId)
                .maybeSingle();
            if (freshInt && freshInt.mfa_code) {
                mfaCodeFromDb = freshInt.mfa_code;
            }
        }

        if (!mfaCodeFromDb) {
            await supabase
                .from('provider_integrations')
                .update({ mfa_status: 'awaiting_2fa', mfa_code: null })
                .eq('user_id', userId);

            // Esperar hasta 4 minutos (80 intentos de 3 segundos) para no bloquear recursos indefinidamente
            for (let i = 0; i < 80; i++) {
                const { data, error: pollError } = await supabase
                    .from('provider_integrations')
                    .select('mfa_code, mfa_status')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (pollError) {
                    console.error("   ⚠️ Error consultando código 2FA:", pollError.message);
                } else if (data) {
                    if (data.mfa_status === 'not_connected') {
                        throw new Error("Conexión cancelada por el usuario en Clio.");
                    }
                    if (data.mfa_code) {
                        mfaCodeFromDb = data.mfa_code;
                        console.log(`   🔑 Código 2FA recibido de Clio: ${mfaCodeFromDb}`);
                        break;
                    }
                }
                await page.waitForTimeout(3000);
            }
        } else {
            console.log(`   🔑 Código 2FA disponible de inmediato: ${mfaCodeFromDb}`);
        }

        if (!mfaCodeFromDb) {
            await supabase
                .from('provider_integrations')
                .update({ mfa_status: 'expired', mfa_code: null })
                .eq('user_id', userId);
            throw new Error(`Tiempo de espera agotado (4 min) sin recibir el código de ${channel.toUpperCase()} en Clio.`);
        }

        if (await codeInput.isVisible()) {
            await codeInput.fill(mfaCodeFromDb);
            await page.waitForTimeout(1000);
        }

        // Marcar recordar dispositivo (90 días)
        const rememberLabel = page.locator('label:has-text("90 días"), label:has-text("Confiar"), label:has-text("dispositivo"), label:has-text("90 days"), label:has-text("Trust"), label:has-text("device"), label[for="trust_device"]').first();
        const rememberInput = page.locator('input[type="checkbox"], input[name="trust_device"], #trust_device').first();

        if (await rememberInput.isVisible()) {
            await rememberInput.check({ force: true }).catch(() => {});
            console.log("   ✅ Checked 'Trust this device' checkbox via Playwright.");
        } else if (await rememberLabel.isVisible()) {
            await rememberLabel.click({ force: true }).catch(() => {});
            console.log("   ✅ Clicked 'Trust this device' label via Playwright.");
        }
        await page.waitForTimeout(1000);

        // Forzar propiedad trust_device en Vue
        await page.evaluate(() => {
            if (typeof vuem !== 'undefined') {
                vuem.trust_device = 1;
            }
        }).catch(() => {});
        await page.waitForTimeout(1000);

        if (await codeInput.isVisible()) {
            const submitBtn = page.locator('button:has-text("Verify"), button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Verificar"), button:has-text("Entrar"), button:has-text("Confirmar"), button:has-text("Enter"), button[type="submit"], .btn-primary').first();
            await submitBtn.click();
            await page.waitForTimeout(8500);
            await handlePin(page, pin);
        }
    }

    // 4. Verificación final de sesión
    const finalUrl = page.url();
    const isLogged = !finalUrl.includes('login') && !finalUrl.includes('two-factor') && !finalUrl.includes('authentication') && finalUrl !== 'about:blank';
    
    if (isLogged) {
        console.log("🎉 Sesión autenticada exitosamente en Amexzone. Guardando cookies...");
        await refreshSessionCookies(context, userId);
    }
};

const triggerProviderLogin = async (userId, existingIntegration = null) => {
    console.log(`\n🚀 [Sync Portal] Disparando autenticación bajo demanda para el usuario: ${userId}`);
    let integration = existingIntegration;
    if (!integration || !integration.amexzone_password || integration.amexzone_password.startsWith('ENCRYPTED:')) {
        const { data: rpcIntegration, error: rpcError } = await supabase.rpc('get_decrypted_integration', { 
            target_user_id: userId,
            secret_key: 'clio_bot_secret_decryption_token_9823472'
        });
        const data = Array.isArray(rpcIntegration) ? rpcIntegration[0] : rpcIntegration;
        if (data && !rpcError) {
            integration = data;
        } else {
            const { data: rawInt } = await supabase
                .from('provider_integrations')
                .select('*')
                .eq('user_id', userId)
                .single();
            integration = rawInt;
        }
    }

    if (!integration || !integration.amexzone_email) {
        console.error(`❌ No se encontró integración válida para el usuario ${userId}`);
        throw new Error("No se encontraron credenciales de Amexzone configuradas.");
    }

    const pin = integration.amexzone_pin || '1206';
    const isServer = process.platform === 'linux';
    const isVncActive = isServer || !!process.env.DISPLAY;
    const userDataDir = path.join(__dirname, `../../user_data_provider_${userId}`);
    const launchOptions = {
        headless: !isVncActive,
        args: isServer 
            ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            : ['--no-sandbox', '--disable-setuid-sandbox']
    };

    const context = await launchBrowserContext(userDataDir, launchOptions, userId);
    const pages = context.pages();
    for (let i = 1; i < pages.length; i++) {
        await pages[i].close().catch(() => {});
    }
    const page = pages[0] || await context.newPage();
    await setupPageInterceptors(page);

    try {
        await page.goto("https://www.amexzone.com/login", { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);
        
        let currentUrl = page.url();
        let isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/two-factor') || currentUrl.includes('/challenge') || currentUrl.includes('/verify') || currentUrl.includes('/verification');

        if (isLoggedOut) {
            await performAmexzoneLogin(page, context, userId, pin, integration);
            
            // Validate that we are truly logged in
            currentUrl = page.url();
            const isStillLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/two-factor') || currentUrl.includes('/challenge') || currentUrl.includes('/verify') || currentUrl.includes('/verification');
            if (isStillLoggedOut) {
                const pageError = await page.locator('.alert-danger, .invalid-feedback, text=/invalid/i, text=/incorrect/i').first().innerText().catch(() => '');
                throw new Error(pageError ? `Amexzone: ${pageError.trim()}` : "No se pudo completar el inicio de sesión en Amexzone.");
            }

            console.log("✅ Inicio de sesión completado.");
            await refreshSessionCookies(context, userId);
        } else {
            console.log("ℹ️ Ya existía una sesión activa en este perfil.");
            await supabase
                .from('provider_integrations')
                .update({ mfa_status: 'connected', updated_at: new Date().toISOString() })
                .eq('user_id', userId);
            await refreshSessionCookies(context, userId);
        }

        // Marcar la tarea [CONNECT] como completed
        try {
            await supabase
                .from('amexzone_note_tasks')
                .update({
                    status: 'completed',
                    result_summary: 'Sesión autorizada por 90 días exitosamente.',
                    error_message: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('note_text', '[CONNECT]');
        } catch (e) {}
    } finally {
        await context.close();
    }
};

module.exports = {
    performAmexzoneLogin,
    triggerProviderLogin
};
