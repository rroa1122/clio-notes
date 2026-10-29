if (!process.env.DISPLAY) {
    process.env.DISPLAY = ':99';
}
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

const cleanStaleLocks = (dir) => {
    try {
        const files = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort', 'lockfile', 'LOCK'];
        files.forEach(f => {
            const p = path.join(dir, f);
            if (fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch (e) {}
            }
        });
    } catch (e) {}
};

const setupPageInterceptors = async (page) => {
    try {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
    } catch (e) {}

    // Block slow 3rd party trackers that cause "Validando entorno..." delays
    try {
        await page.route(/(zendesk|zdassets|onesignal|google-analytics|googletagmanager|tradingview)/, route => route.abort());
    } catch (e) {}

    // Auto dismiss annoying prompts/dialogs
    page.on('dialog', async (dialog) => {
        try {
            await dialog.accept();
        } catch (e) {}
    });
};

const safeGoto = async (page, url, options = { waitUntil: 'domcontentloaded', timeout: 45000 }, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await page.goto(url, options);
        } catch (err) {
            const isNetworkErr = err.message.includes('ERR_TUNNEL') ||
                                 err.message.includes('ERR_PROXY') ||
                                 err.message.includes('ERR_CONNECTION') ||
                                 err.message.includes('Timeout') ||
                                 err.message.includes('net::');
            if (isNetworkErr && attempt < maxRetries) {
                console.log(`⚠️ Reintentando conexión (${attempt}/${maxRetries}): ${err.message}`);
                await page.waitForTimeout(2500 * attempt);
            } else {
                throw err;
            }
        }
    }
};

const waitForLoader = async (page) => {
    try {
        const loader = page.locator('#global_loader:visible, #NotiflixLoadingWrap:visible, .blockUI:visible, .loading-overlay:visible').first();
        if (await loader.isVisible().catch(() => false)) {
            await loader.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        }
    } catch (e) {}

    // Auto-check PIN in DOM during loader checks if modal appears
    try {
        const hasPinModal = await page.evaluate(() => {
            const m = document.getElementById('access_code_modal');
            return !!(m && (m.classList.contains('show') || m.style.display === 'block'));
        }).catch(() => false);
        if (hasPinModal) {
            const { handlePin, getActiveSessionPin } = require('./sessionManager');
            await handlePin(page, getActiveSessionPin());
        }
    } catch (e) {}
};

const launchBrowserContext = async (userDataDir, launchOptions, userId = null) => {
    cleanStaleLocks(userDataDir);
    let context;

    // Stealth arguments
    const baseArgs = launchOptions.args || [];
    const stealthArgs = [
        ...baseArgs,
        '--disable-blink-features=AutomationControlled',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-features=Translate,TranslateUI',
        '--disable-notifications',
        '--disable-session-crashed-bubble',
        '--hide-crash-restore-bubble',
        '--disable-dev-shm-usage'
    ];
    const augmentedLaunchOptions = {
        ...launchOptions,
        viewport: { width: 1366, height: 768 },
        args: Array.from(new Set(stealthArgs))
    };

    try {
        context = await chromium.launchPersistentContext(userDataDir, augmentedLaunchOptions);
    } catch (err) {
        if (err.message.includes('ProcessSingleton') || err.message.includes('Lock file') || err.message.includes('already in use')) {
            console.log("⚠️ Perfil principal bloqueado por Chrome activo. Creando contexto temporal de sesión...");
            const tempDir = userDataDir + '_runner_temp';
            try {
                if (fs.existsSync(userDataDir)) {
                    fs.cpSync(userDataDir, tempDir, { 
                        recursive: true, 
                        filter: (src) => !src.includes('Singleton') && !src.includes('lock') && !src.includes('DevToolsActivePort') 
                    });
                }
            } catch (e) {
                console.log("   ⚠️ Copia parcial de perfil temp:", e.message);
            }
            cleanStaleLocks(tempDir);
            context = await chromium.launchPersistentContext(tempDir, augmentedLaunchOptions);
        } else {
            throw err;
        }
    }

    // Inject active session cookies from DB
    if (userId) {
        try {
            const { data: dbInt } = await supabase
                .from('provider_integrations')
                .select('session_cookies')
                .eq('user_id', userId)
                .maybeSingle();
            if (dbInt && Array.isArray(dbInt.session_cookies) && dbInt.session_cookies.length > 0) {
                console.log(`🍪 Inyectando ${dbInt.session_cookies.length} cookies de sesión activas...`);
                const validCookies = dbInt.session_cookies.map(c => ({
                    name: c.name, value: c.value, domain: c.domain || 'www.amexzone.com',
                    path: c.path || '/', secure: c.secure !== false,
                    httpOnly: c.httpOnly || false, sameSite: c.sameSite || 'Lax'
                }));
                await context.addCookies(validCookies).catch(() => {});
            }
        } catch (e) {
            console.log("⚠️ No se pudieron cargar cookies de sesión:", e.message);
        }
    }

    return context;
};

module.exports = {
    launchBrowserContext,
    setupPageInterceptors,
    safeGoto,
    waitForLoader,
    cleanStaleLocks
};
