// Default Supabase Configuration
const DEFAULT_SUPABASE_URL = 'https://toisvwdmscmnogzcpeyj.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_E7E4184wtBhtTXD0hobNnQ_OALEmO9G';
const DEFAULT_EHR_DOMAIN = 'amexzone.com';

let currentUserId = null;
let currentEhrDomain = DEFAULT_EHR_DOMAIN;

// DOM Elements
const statusDot = document.getElementById('status-dot');
const statusDotPulse = document.getElementById('status-dot-pulse');
const statusText = document.getElementById('status-text');
const accountEmailEl = document.getElementById('account-email');
const syncBtn = document.getElementById('sync-btn');
const syncBtnText = document.getElementById('sync-btn-text');
const feedbackMessage = document.getElementById('feedback-message');
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings-btn');

const inputSupabaseUrl = document.getElementById('settings-supabase-url');
const inputSupabaseKey = document.getElementById('settings-supabase-key');
const inputEhrDomain = document.getElementById('settings-ehr-domain');

// Initialize Extension Popup
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Settings
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'ehrDomain'], (data) => {
        inputSupabaseUrl.value = data.supabaseUrl || DEFAULT_SUPABASE_URL;
        inputSupabaseKey.value = data.supabaseKey || DEFAULT_SUPABASE_KEY;
        inputEhrDomain.value = data.ehrDomain || DEFAULT_EHR_DOMAIN;
        currentEhrDomain = inputEhrDomain.value;
        
        // Check sessions after settings are loaded
        checkSessions();
    });

    // 2. Event Listeners
    toggleSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        const url = inputSupabaseUrl.value.trim();
        const key = inputSupabaseKey.value.trim();
        const domain = inputEhrDomain.value.trim();

        chrome.storage.local.set({
            supabaseUrl: url,
            supabaseKey: key,
            ehrDomain: domain
        }, () => {
            currentEhrDomain = domain;
            showFeedback('Configuración guardada.', 'success');
            settingsPanel.classList.add('hidden');
            checkSessions();
        });
    });

    syncBtn.addEventListener('click', performSync);
});

// Helper to decode JWT
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Check Clio and EHR sessions
async function checkSessions() {
    updateStatus('checking', 'Checking sessions...');

    // 1. Look for Clio Notes auth token in cookies
    // Supabase can store session in cookies or localStorage. We look for 'clio-auth-token'
    chrome.cookies.getAll({}, (cookies) => {
        let authCookie = null;
        for (const cookie of cookies) {
            if (cookie.name === 'clio-auth-token') {
                authCookie = cookie;
                break;
            }
        }

        if (authCookie) {
            try {
                // Decode the cookie value (which holds the Supabase session json)
                const decodedVal = decodeURIComponent(authCookie.value);
                const sessionObj = JSON.parse(decodedVal);
                const accessToken = sessionObj.access_token;
                const jwtData = parseJwt(accessToken);
                
                if (jwtData && jwtData.email) {
                    currentUserId = jwtData.sub;
                    accountEmailEl.textContent = jwtData.email;
                    accountEmailEl.style.color = 'var(--text-primary)';
                } else {
                    throw new Error("Invalid JWT");
                }
            } catch (e) {
                console.error("Error parsing Clio token cookie:", e);
                accountEmailEl.textContent = "Error reading profile. Please log in again.";
                accountEmailEl.style.color = 'var(--error-color)';
                currentUserId = null;
            }
        } else {
            accountEmailEl.textContent = "Not logged in. Open Clio Notes.";
            accountEmailEl.style.color = 'var(--warning-color)';
            currentUserId = null;
        }

        // 2. Check EHR session cookies
        chrome.cookies.getAll({ domain: currentEhrDomain }, (ehrCookies) => {
            const hasSession = ehrCookies && ehrCookies.length > 0;
            
            if (hasSession) {
                if (currentUserId) {
                    updateStatus('active', 'EHR session active and ready.');
                    syncBtn.disabled = false;
                } else {
                    updateStatus('warning', 'EHR active. Please log in to Clio.');
                    syncBtn.disabled = true;
                }
            } else {
                updateStatus('error', `Session for ${currentEhrDomain} not found.`);
                syncBtn.disabled = true;
            }
        });
    });
}

// Update status panel visual state
function updateStatus(state, message) {
    statusText.textContent = message;
    
    // Clear status dot classes
    statusDot.className = 'status-dot';
    statusDotPulse.className = 'logo-pulse';

    if (state === 'active') {
        statusDot.classList.add('active');
        statusDotPulse.classList.add('active');
    } else if (state === 'warning') {
        statusDot.classList.add('warning');
        statusDotPulse.classList.add('warning');
    } else if (state === 'error') {
        statusDot.classList.add('error');
        statusDotPulse.classList.add('error');
    } else {
        // checking
    }
}

// Feedback banner helper
function showFeedback(msg, type) {
    feedbackMessage.textContent = msg;
    feedbackMessage.className = 'feedback ' + type;
    setTimeout(() => {
        feedbackMessage.className = 'feedback hidden';
    }, 4000);
}

// Call background.js to upload cookies to Supabase
function performSync() {
    if (!currentUserId) {
        showFeedback('Error: Please log in to Clio Notes.', 'error');
        return;
    }

    syncBtn.disabled = true;
    syncBtnText.textContent = 'Syncing...';

    chrome.runtime.sendMessage({
        action: 'sync_session',
        userId: currentUserId,
        ehrDomain: currentEhrDomain
    }, (response) => {
        syncBtn.disabled = false;
        syncBtnText.textContent = 'Sync Active Session';

        if (response && response.success) {
            showFeedback('Session synced successfully!', 'success');
            checkSessions();
        } else {
            const errorMsg = response ? response.error : 'Unknown error syncing session.';
            showFeedback('Sync failed: ' + errorMsg, 'error');
        }
    });
}
