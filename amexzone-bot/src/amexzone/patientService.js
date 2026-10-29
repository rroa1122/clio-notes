const { supabase } = require('../config/supabase');
const { handlePin, handleCompanySelection, isLoggedOut, matchPatientName } = require('../core/sessionManager');
const { waitForLoader, safeGoto } = require('../core/browser');

const navigateToPatient = async (page, patientEmrId, patientName, pin, userId) => {
    let needsSearch = false;
    
    if (patientEmrId) {
        try {
            console.log(`🌐 Navegando a Amexzone - Detalles del Paciente (ID: ${patientEmrId}&v=2)...`);
            await safeGoto(page, `https://www.amexzone.com/patient/info?id=${patientEmrId}&v=2`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await waitForLoader(page);
            await handleCompanySelection(page);
            await handlePin(page, pin);
            await waitForLoader(page);

            if (isLoggedOut(page)) {
                console.log("⚠️ La sesión de Amexzone no está activa o requiere renovación.");
                throw new Error("Tu sesión de Amexzone no está activa o ha expirado. Por favor ve a Sync Portal para conectar tu sesión de 90 días.");
            }

            const pageTitle = (await page.title().catch(() => "")).toLowerCase();
            const headingText = (await page.locator('h1, h2, h3, .error-content, .card-title').allInnerTexts().catch(() => [])).join(' ').toLowerCase();

            if (
                pageTitle.includes('404') || 
                pageTitle.includes('not found') || 
                pageTitle.includes('no encontrada') || 
                headingText.includes('page not found') || 
                headingText.includes('página no encontrada') || 
                headingText.includes('pagina no encontrada') || 
                headingText.includes('no existe o ha sido movida') || 
                headingText.includes('access restricted') ||
                page.url().includes('404')
            ) {
                console.log("⚠️ Acceso directo restringido o ID inválido (Página no encontrada). Buscaremos al paciente por nombre...");
                needsSearch = true;
            }
        } catch (err) {
            if (err.message.includes('Sync Portal') || err.message.includes('sesión de Amexzone')) {
                throw err;
            }
            console.log(`⚠️ Error al navegar directamente (${err.message}). Buscaremos al paciente por nombre...`);
            needsSearch = true;
        }
    } else {
        needsSearch = true;
    }

    if (needsSearch) {
        console.log("🌐 Navegando a la sección de Pacientes de Amexzone...");
        await safeGoto(page, "https://www.amexzone.com/patient", { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(4000);
        await handleCompanySelection(page);
        await handlePin(page, pin);
        await waitForLoader(page);

        // Click on 'Pacientes' menu link
        const pacientesMenu = page.locator('a, button').filter({ hasText: /^Pacientes$|^Patients$/i }).first();
        if (await pacientesMenu.isVisible().catch(() => false)) {
            await pacientesMenu.click();
            await page.waitForTimeout(3000);
            await handlePin(page, pin);
            await waitForLoader(page);
        }

        if (isLoggedOut(page)) {
            console.log("⚠️ La sesión de Amexzone no está activa o requiere renovación.");
            throw new Error("Tu sesión de Amexzone ha expirado. Por favor ve a Sync Portal para conectar tu sesión de 90 días.");
        }

        console.log(`🔍 Buscando al paciente "${patientName}" en la lista...`);
        let searchInput = page.locator('#patient_search, input[type="search"], .dataTables_filter input, input[name*="search"], #search_patient, #patient_filter_name, input[placeholder*="Buscar"], input[placeholder*="Search"], input[type="text"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 30000 });
        await searchInput.click();
        const nameParts = patientName.trim().split(/\s+/);
        const searchWord = nameParts[nameParts.length - 1];
        await page.keyboard.type(searchWord, { delay: 100 });
        await page.waitForTimeout(4000);

        const matches = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr, ul li, div.media'));
            return rows.map(row => {
                const links = Array.from(row.querySelectorAll('a'));
                const infoLink = links.find(l => l.href && (l.href.includes('/patient/info') || l.href.includes('/patient/documentation/fill/')));
                if (infoLink) {
                    let patientId = '';
                    if (infoLink.href.includes('id=')) {
                        patientId = infoLink.href.split('id=')[1];
                    } else {
                        const match = infoLink.href.match(/\/fill\/\d+\/(\d+)/);
                        if (match) {
                            patientId = match[1];
                        }
                    }
                    return {
                        name: row.innerText.trim(),
                        url: infoLink.href,
                        id: patientId
                    };
                }
                return null;
            }).filter(Boolean);
        });

        console.log(`📋 Candidatos encontrados: ${matches.length}`);
        const selectedMatch = matches.find(m => matchPatientName(patientName, m.name)) || matches[0];
        
        if (!selectedMatch) {
            throw new Error(`No se encontró el paciente "${patientName}" en la lista de Amexzone.`);
        }

        console.log(`🎯 Paciente encontrado en la lista: ${selectedMatch.name.split('\n')[0]} (ID: ${selectedMatch.id || 'N/A'})`);
        const resolvedId = selectedMatch.id ? String(selectedMatch.id).replace('&v=2', '').trim() : '';
        
        if (resolvedId && userId) {
            try {
                await supabase
                    .from('patients')
                    .update({ amexzone_id: resolvedId })
                    .ilike('full_name', patientName)
                    .eq('user_id', userId);
                console.log(`✅ Amexzone ID ${resolvedId} guardado en la base de datos para ${patientName}.`);
            } catch (dbErr) {}
        }
        
        await page.goto(selectedMatch.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(4000);
        await handlePin(page, pin);
        await waitForLoader(page);
    }
};

module.exports = {
    navigateToPatient
};
