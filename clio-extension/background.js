const DEFAULT_SUPABASE_URL = 'https://toisvwdmscmnogzcpeyj.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_E7E4184wtBhtTXD0hobNnQ_OALEmO9G';

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sync_session') {
        handleSyncSession(request.userId, request.ehrDomain)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        
        return true; // Keep message channel open for asynchronous response
    }
});

// Primary Sync handler
async function handleSyncSession(userId, ehrDomain) {
    // 1. Get configurations
    const config = await new Promise(resolve => {
        chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], resolve);
    });

    const supabaseUrl = config.supabaseUrl || DEFAULT_SUPABASE_URL;
    const supabaseKey = config.supabaseKey || DEFAULT_SUPABASE_KEY;

    // 2. Retrieve Clio auth token from cookies
    const allCookies = await new Promise(resolve => {
        chrome.cookies.getAll({}, resolve);
    });

    const authCookie = allCookies.find(c => c.name === 'clio-auth-token');
    if (!authCookie) {
        throw new Error("No se encontró la sesión de Clio Notes. Inicia sesión en la aplicación web.");
    }

    let accessToken = '';
    try {
        const decodedVal = decodeURIComponent(authCookie.value);
        const sessionObj = JSON.parse(decodedVal);
        accessToken = sessionObj.access_token;
    } catch (e) {
        throw new Error("Error al analizar la sesión de Clio Notes.");
    }

    if (!accessToken) {
        throw new Error("Falta el token de acceso de Clio Notes.");
    }

    // 3. Extract EHR cookies
    const ehrCookies = await new Promise(resolve => {
        chrome.cookies.getAll({ domain: ehrDomain }, resolve);
    });

    if (!ehrCookies || ehrCookies.length === 0) {
        throw new Error(`No hay cookies de sesión activas para ${ehrDomain}.`);
    }

    // Map cookies to a clean serializable array
    const mappedCookies = ehrCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate
    }));

    // 4. Check if the user already has an integration record
    const checkUrl = `${supabaseUrl}/rest/v1/provider_integrations?user_id=eq.${userId}&select=id`;
    const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!checkResponse.ok) {
        const checkError = await checkResponse.text();
        throw new Error(`Error al verificar integración: ${checkResponse.status} - ${checkError}`);
    }

    const checkData = await checkResponse.json();
    const recordExists = checkData && checkData.length > 0;

    let response;
    if (recordExists) {
        // Perform UPDATE (PATCH)
        const updateUrl = `${supabaseUrl}/rest/v1/provider_integrations?user_id=eq.${userId}`;
        const updatePayload = {
            session_cookies: mappedCookies,
            mfa_status: 'connected',
            updated_at: new Date().toISOString()
        };

        console.log(`Updating existing session cookies for user: ${userId}`);
        response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updatePayload)
        });
    } else {
        // Perform INSERT (POST)
        const insertUrl = `${supabaseUrl}/rest/v1/provider_integrations`;
        const insertPayload = {
            user_id: userId,
            session_cookies: mappedCookies,
            mfa_status: 'connected',
            updated_at: new Date().toISOString()
        };

        console.log(`Inserting new integration record with cookies for user: ${userId}`);
        response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(insertPayload)
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Supabase API Error:", errorText);
        throw new Error(`Error de base de datos: ${response.status} - ${errorText}`);
    }

    return { syncedCookiesCount: mappedCookies.length };
}
