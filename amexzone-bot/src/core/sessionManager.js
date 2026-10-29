const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

let activeSessionPin = '2017';

const setActiveSessionPin = (pin) => {
    if (pin && String(pin).trim()) {
        activeSessionPin = String(pin).trim();
    }
};

const getActiveSessionPin = () => {
    return activeSessionPin;
};

const matchPatientName = (targetName, candidateName) => {
    if (!targetName || !candidateName) return false;
    
    // 1. Direct clean comparison
    const cleanTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCand = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTarget === cleanCand || cleanCand.includes(cleanTarget) || cleanTarget.includes(cleanCand)) {
        return true;
    }
    
    // 2. Token / Word matching using UNIQUE words
    const targetWords = Array.from(new Set(targetName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1)));
    const candWords = Array.from(new Set(candidateName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1)));
    
    if (targetWords.length === 0 || candWords.length === 0) return false;
    
    // The first name in target (e.g. "esneldo") MUST match a word in candidate
    const firstName = targetWords[0];
    const firstNameMatches = candWords.some(cw => cw.includes(firstName) || firstName.includes(cw));
    
    // Count distinct matched words
    const matchedCount = targetWords.filter(tw => candWords.some(cw => cw.includes(tw) || tw.includes(cw))).length;
    
    // If all distinct target words match
    if (matchedCount === targetWords.length) {
        return true;
    }
    
    // If the first name matches AND at least 2 distinct words match
    if (firstNameMatches && matchedCount >= 2) {
        return true;
    }
    
    return false;
};

const refreshSessionCookies = async (context, userId) => {
    if (!userId || !context) return;
    try {
        const currentCookies = await context.cookies();
        if (Array.isArray(currentCookies) && currentCookies.length > 0) {
            await supabase
                .from('provider_integrations')
                .update({ 
                    session_cookies: currentCookies, 
                    mfa_status: 'connected',
                    mfa_code: null,
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', userId);

            // Local backup
            try {
                const backupsDir = path.join(__dirname, '../../backups');
                if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
                fs.writeFileSync(path.join(backupsDir, `session_cookies_${userId}.json`), JSON.stringify(currentCookies, null, 2));
            } catch (e) {}

            console.log(`🍪 Cookies de sesión renovadas, respaldadas y guardadas en Supabase (${currentCookies.length} cookies).`);
        }
    } catch (e) {
        console.log("⚠️ No se pudieron renovar las cookies de sesión:", e.message);
    }
};

const ensurePinUnlocked = async (page, pin, maxWaitMs = 600) => {
    try {
        const pinToUse = String(pin || activeSessionPin || '2017').trim();
        
        // Fast DOM check first
        const isModalPresent = await page.evaluate(() => {
            const m = document.getElementById('access_code_modal');
            return !!(m && (m.classList.contains('show') || m.style.display === 'block' || window.getComputedStyle(m).display !== 'none'));
        }).catch(() => false);

        const pinInput = page.locator('#access_code:visible, textarea#access_code:visible, input#access_code:visible').first();
        const isInputVisible = await pinInput.isVisible().catch(() => false);

        if (isModalPresent || isInputVisible) {
            console.log(`🔑 [PIN] Modal de Código de Acceso detectado. Ingresando PIN ${pinToUse}...`);
            
            // Fill cleanly via Playwright sequence and submit once
            if (isInputVisible) {
                await pinInput.fill('');
                await pinInput.fill(pinToUse);
            }

            // Enter via DOM directly and trigger single submit
            await page.evaluate((p) => {
                const inp = document.getElementById('access_code');
                if (inp) {
                    inp.value = p;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    if (window.jQuery) window.jQuery(inp).val(p).trigger('change').trigger('input');
                }
                const btn = document.getElementById('entrar_access_code_btn');
                if (btn) {
                    btn.click();
                } else if (typeof window.checkAccessCode === 'function') {
                    window.checkAccessCode();
                }
            }, pinToUse).catch(() => {});

            await page.waitForTimeout(400);

            // Clean modal & backdrops if dismissed
            await page.evaluate(() => {
                const m = document.getElementById('access_code_modal');
                if (m) {
                    m.classList.remove('show');
                    m.style.display = 'none';
                    if (window.jQuery) window.jQuery(m).modal('hide');
                }
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
            }).catch(() => {});

            console.log("🔓 [PIN] Modal de Código de Acceso desbloqueado exitosamente.");
            return true;
        }
    } catch (e) {
        console.log("⚠️ [ensurePinUnlocked] Error:", e.message);
    }
    return false;
};

const handlePin = async (page, pin) => {
    return ensurePinUnlocked(page, pin, 600);
};

const handleUnsavedChanges = async (page) => {
    return false;
};

const handleCompanySelection = async (page) => {
    try {
        const enterWorkerBtn = page.locator('a[href*="/user/entrar/empresa/rol/"], a:has-text("Enter as Worker"), a:has-text("ENTER AS WORKER")').first();
        if (await enterWorkerBtn.isVisible().catch(() => false)) {
            console.log("🏢 [Company] Detectada pantalla de General Dashboard. Haciendo clic en 'ENTER AS WORKER'...");
            const href = await enterWorkerBtn.getAttribute('href').catch(() => null);
            if (href && href.startsWith('http')) {
                await page.goto(href, { waitUntil: 'domcontentloaded' });
            } else {
                await enterWorkerBtn.click({ force: true });
            }
            await page.waitForTimeout(3000);
            const { waitForLoader } = require('./browser');
            await waitForLoader(page);
            return true;
        }
    } catch (e) {
        console.log("⚠️ Error en handleCompanySelection:", e.message);
    }
    return false;
};

const isLoggedOut = (page) => {
    const url = page.url().toLowerCase();
    return url.includes('/login') || url.includes('/two-factor') || url.includes('/challenge') || url.includes('/verification');
};

module.exports = {
    setActiveSessionPin,
    getActiveSessionPin,
    matchPatientName,
    refreshSessionCookies,
    handlePin,
    ensurePinUnlocked,
    handleUnsavedChanges,
    handleCompanySelection,
    isLoggedOut
};
