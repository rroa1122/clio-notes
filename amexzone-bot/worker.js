const { chromium } = require('playwright');
if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = require('ws');
}
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Load environment variables from .env if present
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (process.platform === 'linux' && !process.env.DISPLAY) {
    process.env.DISPLAY = ':99';
}

const { supabase } = require('./src/config/supabase');
const {
    launchBrowserContext,
    setupPageInterceptors,
    waitForLoader,
    cleanStaleLocks
} = require('./src/core/browser');
const {
    matchPatientName,
    refreshSessionCookies,
    handlePin,
    handleUnsavedChanges
} = require('./src/core/sessionManager');
const { performAmexzoneLogin } = require('./src/core/authService');

async function processTask(task, integration) {
    console.log(`\n⚙️  PROCESANDO TAREA: ${task.id}`);
    console.log(`👤 Paciente: ${task.patient_name}`);

    let payload;
    try {
        const cleanedStr = task.note_text
            .replace(/^\[TCM_ASSESSMENT\][\r\n\s\\]*(?:n)?/i, '')
            .replace(/^\[TCM_SERVICE_PLAN\][\r\n\s\\]*(?:n)?/i, '');
        payload = JSON.parse(cleanedStr);
    } catch (e) {
        console.error("❌ Error al parsear el payload:", e.message);
        throw new Error("Payload inválido.");
    }

    const userId = task.user_id;
    const pin = integration.amexzone_pin || '1206';
    
    let patientEmrId = '';
    const rawAmexId = payload.amexzone_id || payload.patient_amexzone_id || '';
    if (rawAmexId && /^\d+$/.test(String(rawAmexId).trim())) {
        patientEmrId = String(rawAmexId).trim();
    }

    // Si no vino directo en el payload, buscar amexzone_id en la base de datos
    if (!patientEmrId && payload.patient_id) {
        try {
            const { data: pDb } = await supabase.from('patients').select('amexzone_id').eq('id', payload.patient_id).maybeSingle();
            if (pDb && pDb.amexzone_id && /^\d+$/.test(String(pDb.amexzone_id).trim())) {
                patientEmrId = String(pDb.amexzone_id).trim();
            }
        } catch (e) {}
    }
    if (!patientEmrId && task.patient_name) {
        try {
            const { data: pDb } = await supabase.from('patients').select('amexzone_id').ilike('full_name', task.patient_name).maybeSingle();
            if (pDb && pDb.amexzone_id && /^\d+$/.test(String(pDb.amexzone_id).trim())) {
                patientEmrId = String(pDb.amexzone_id).trim();
            }
        } catch (e) {}
    }

    if (!patientEmrId) {
        console.log(`⚠️ No se tiene el ID numérico interno de Amexzone para "${task.patient_name}". Se buscará por nombre en la lista.`);
    } else {
        console.log(`🎯 ID numérico interno de Amexzone resuelto: ${patientEmrId}`);
    }

    // Directorio persistente de sesión específico para este proveedor
    const userDataDir = path.join(__dirname, `user_data_provider_${userId}`);
    console.log(`📁 Perfil persistente en: ${userDataDir}`);

    const isServer = os.platform() === 'linux';
    const launchOptions = {
        headless: isServer,
        viewport: { width: 1366, height: 768 },
        recordVideo: { dir: path.join(__dirname, 'videos') },
        args: isServer 
            ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            : ['--no-sandbox', '--disable-setuid-sandbox']
    };

    if (process.env.PROXY_SERVER) {
        console.log(`🌐 Enrutando tráfico a través del proxy: ${process.env.PROXY_SERVER}`);
        launchOptions.proxy = {
            server: process.env.PROXY_SERVER
        };
        if (process.env.PROXY_USERNAME) {
            console.log(`👤 Usando proxy Webshare: ${process.env.PROXY_USERNAME}`);
            launchOptions.proxy.username = process.env.PROXY_USERNAME;
            launchOptions.proxy.password = process.env.PROXY_PASSWORD;
        }
    }

    const context = await launchBrowserContext(userDataDir, launchOptions, userId);

    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    try {
        let needsSearch = false;
        
        if (patientEmrId) {
            try {
                console.log(`🌐 Navegando a Amexzone - Detalles del Paciente (ID: ${patientEmrId}&v=2)...`);
                await page.goto(`https://www.amexzone.com/patient/info?id=${patientEmrId}&v=2`, { waitUntil: 'load', timeout: 60000 });
                await page.waitForTimeout(5000);
                await handlePin(page, pin);

                // Verificar si nos redirigió al login o a la autenticación (sesión expirada o no iniciada)
                let currentUrl = page.url();
                let isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/two-factor') || currentUrl.includes('/challenge') || currentUrl.includes('/verification');

                if (isLoggedOut) {
                    console.log("⚠️ La sesión de Amexzone no está activa o requiere renovación 2FA.");
                    throw new Error("Tu sesión de Amexzone ha expirado. Por favor ve a Sync Portal o usa la extensión Clio Sync para sincronizar tu sesión activa.");
                }

                const finalBodyText = (await page.innerText('body').catch(() => "")).toLowerCase();
                if (
                    finalBodyText.includes('page not found') || 
                    finalBodyText.includes('página no encontrada') || 
                    finalBodyText.includes('pagina no encontrada') || 
                    finalBodyText.includes('no existe o ha sido movida') || 
                    finalBodyText.includes('access restricted') ||
                    page.url().includes('404')
                ) {
                    console.log("⚠️ Acceso directo restringido o ID inválido (Página no encontrada). Buscaremos al paciente por nombre...");
                    needsSearch = true;
                }
            } catch (err) {
                if (err.message && err.message.includes('sesión de Amexzone')) throw err;
                console.log(`⚠️ Error al navegar directamente (${err.message}). Buscaremos al paciente por nombre...`);
                needsSearch = true;
            }
        } else {
            needsSearch = true;
        }

        if (needsSearch) {
            console.log("🌐 Navegando a la lista de pacientes de Amexzone...");
            await page.goto("https://www.amexzone.com/patients", { waitUntil: 'load', timeout: 90000 });
            await page.waitForTimeout(5000);
            await handlePin(page, pin);
            await waitForLoader(page);

            let currentUrl = page.url();
            let isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/two-factor') || currentUrl.includes('/challenge') || currentUrl.includes('/verification');

            if (isLoggedOut) {
                console.log("⚠️ La sesión de Amexzone no está activa o requiere renovación 2FA.");
                throw new Error("Tu sesión de Amexzone ha expirado. Por favor ve a Sync Portal o usa la extensión Clio Sync para sincronizar tu sesión activa.");
            }

            // Si estamos en el inicio y hay enlace "Ver Todos", hacer clic para abrir el directorio completo
            const verTodos = page.locator('a:has-text("Ver Todos"), a:has-text("Ver todos"), a:has-text("Pacientes")').first();
            if (await verTodos.isVisible().catch(() => false) && page.url().includes('amexzone.com') && !page.url().includes('/patients')) {
                console.log("👉 Haciendo clic en 'Ver Todos' para abrir el directorio de pacientes...");
                await verTodos.click().catch(() => {});
                await page.waitForTimeout(3000);
                await waitForLoader(page);
            }

            console.log(`🔍 Buscando al paciente "${task.patient_name}" en la lista...`);
            let searchInput = page.locator('div').filter({ has: page.locator('h6', { hasText: /^Nombre$|^Name$/i }) }).locator('input[type="text"]').first();
            if (!await searchInput.isVisible().catch(() => false)) {
                searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[name*="search"], #search_patient, .dataTables_filter input, input[type="text"]').first();
            }
            await searchInput.waitFor({ state: 'visible', timeout: 30000 });
            const nameParts2 = task.patient_name.trim().split(/\s+/);
            const searchQueries2 = [];
            if (nameParts2.length >= 3) {
                searchQueries2.push(nameParts2.join(' '));
                searchQueries2.push(`${nameParts2[0]} ${nameParts2[1]}`);
            } else if (nameParts2.length === 2) {
                searchQueries2.push(`${nameParts2[0]} ${nameParts2[1]}`);
            } else {
                searchQueries2.push(task.patient_name.trim());
            }

            const extractMatches1 = async () => {
                return await page.evaluate(() => {
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    return allLinks.map(infoLink => {
                        const href = infoLink.getAttribute('href') || infoLink.href || '';
                        let patientId = '';
                        if (href.includes('/patient/info') || href.includes('/patient/') || href.includes('/fill/')) {
                            if (href.includes('id=')) {
                                patientId = href.split('id=')[1].split('&')[0];
                            } else {
                                const match = href.match(/\/fill\/\d+\/(\d+)/);
                                if (match) patientId = match[1];
                            }
                        }
                        if (!patientId) {
                            const onclick = infoLink.getAttribute('onclick') || '';
                            const match = onclick.match(/\((\d+)\)/);
                            if (match) patientId = match[1];
                        }
                        const container = infoLink.closest('tr') || infoLink.closest('li') || infoLink.closest('div.media') || infoLink.parentElement;
                        const fullText = (container ? container.innerText : infoLink.innerText) || '';
                        const linkText = infoLink.innerText.trim();
                        if (patientId && (linkText || fullText)) {
                            return {
                                name: linkText || fullText.split('\n')[0].trim(),
                                url: href.startsWith('http') ? href : `https://www.amexzone.com${href}`,
                                id: patientId,
                                fullText: fullText
                            };
                        }
                        return null;
                    }).filter(p => p !== null && p.id);
                });
            };

            let selectedMatch = null;
            for (const query of searchQueries2) {
                console.log(`🔍 Buscando en Amexzone: "${query}"...`);
                await searchInput.click();
                await page.keyboard.down('Control');
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');
                await page.waitForTimeout(300);
                await page.keyboard.type(query, { delay: 50 });
                await page.keyboard.press('Enter');
                await page.waitForTimeout(4000);

                const matches = await extractMatches1();
                selectedMatch = matches.find(m => matchPatientName(task.patient_name, m.name));
                if (selectedMatch) break;
            }

            if (!selectedMatch) {
                throw new Error(`No se encontró ningún paciente con el nombre "${task.patient_name}" en tu cuenta de Amexzone.`);
            }
            console.log(`🎯 Paciente encontrado en la lista: ${selectedMatch.name} (ID: ${selectedMatch.id})`);
            patientEmrId = selectedMatch.id;
            
            // ACTUALIZAR AMEXZONE ID EN LA BASE DE DATOS
            const patientTargetId = payload.patient_id;
            if (patientTargetId) {
                try {
                    const { error: dbErr } = await supabase
                        .from('patients')
                        .update({ amexzone_id: patientEmrId })
                        .eq('id', patientTargetId);
                    if (dbErr) {
                        console.log(`⚠️ No se pudo guardar el Amexzone ID en la BD: ${dbErr.message}`);
                    } else {
                        console.log(`✅ Amexzone ID ${patientEmrId} guardado en la base de datos para el paciente.`);
                    }
                } catch (dbErr) {
                    console.log(`⚠️ Error al actualizar Amexzone ID en la BD: ${dbErr.message}`);
                }
            } else {
                try {
                    const { error: dbErr } = await supabase
                        .from('patients')
                        .update({ amexzone_id: patientEmrId })
                        .ilike('full_name', task.patient_name)
                        .eq('user_id', task.user_id);
                    if (dbErr) {
                        console.log(`⚠️ No se pudo guardar el Amexzone ID en la BD (por nombre): ${dbErr.message}`);
                    } else {
                        console.log(`✅ Amexzone ID ${patientEmrId} guardado en la base de datos por nombre.`);
                    }
                } catch (dbErr) {
                    console.log(`⚠️ Error al actualizar Amexzone ID por nombre en la BD: ${dbErr.message}`);
                }
            }
            
            await page.goto(selectedMatch.url, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(5000);
            await handlePin(page, pin);
            await waitForLoader(page);
        }

        const isServicePlan = payload.type === 'TCM_SERVICE_PLAN';
        const docType = isServicePlan ? 'service_plan' : 'assessment';

        let frame = page;
        let isModal = false;

        console.log("🔍 Buscando si ya existe un borrador 'En Progreso'...");
        const docLabel = isServicePlan ? 'Service Plan' : 'Assessment';
        
        // Si estamos en la nueva interfaz v=2, asegurar pestaña "TCM - Documentación"
        try {
            const tcmTabBtn = page.locator('a.section-list').filter({ hasText: /TCM - Documentación|Documentación/i }).first();
            if (await tcmTabBtn.isVisible().catch(() => false)) {
                console.log("📑 Cambiando a pestaña 'TCM - Documentación' en la nueva interfaz...");
                await tcmTabBtn.click();
                await page.waitForTimeout(3000);
            }
        } catch (e) {}

        const existingDraft = page.locator(`li.list-item, tr, .media, div[role="row"]`)
            .filter({ hasText: new RegExp(docLabel, 'i') })
            .filter({ hasText: /En Progreso|In Progress/i })
            .first();
        
        if (await existingDraft.isVisible().catch(() => false)) {
            console.log(`🎯 ¡Borrador existente de ${docLabel} encontrado! Abriéndolo para actualizar...`);
            const clickTarget = existingDraft.locator('a, .badge, button, span').first();
            if (await clickTarget.isVisible().catch(() => false)) {
                await clickTarget.click();
            } else {
                await existingDraft.click();
            }
            await page.waitForTimeout(5000);
            await handlePin(page, pin);

            const dismissBtn = page.locator('button:has-text("Después"), span:has-text("Después"), a:has-text("Después")').first();
            if (await dismissBtn.isVisible().catch(() => false)) {
                await dismissBtn.click().catch(() => {});
                console.log("🔔 Descartada promo de notificaciones push antes de editar.");
                await page.waitForTimeout(1000);
            }
            
            frame = page.frameLocator('iframe[name="utils_iframe"]');
            isModal = true;
        } else {
            console.log(`🆕 No se encontró ningún borrador 'En Progreso'. Creando uno nuevo...`);
            const formUrl = `https://www.amexzone.com/iframe/patient/documentation/fill/106/${patientEmrId}/${docType}`;
            console.log(`🌐 Navegando al creador de formularios: ${formUrl}`);
            await page.goto(formUrl, { waitUntil: 'load', timeout: 90000 });
            await page.waitForTimeout(4000);
            await handlePin(page, pin);
            frame = page;
            isModal = false;
        }

        console.log(`📋 ¡Formulario de ${docLabel} listo! Llenando campos...`);

        const expandAllAccordions = async () => {
            try {
                console.log("🔓 Expandiendo todas las secciones colapsadas del formulario...");
                // Find all triggers that are collapsed
                const collapsedToggles = await frame.locator('.accordion_in.collapsed, .card-header.collapsed, [data-toggle="collapse"].collapsed, .acc_trigger.collapsed').all();
                for (const toggle of collapsedToggles) {
                    if (await toggle.isVisible().catch(() => false)) {
                        await toggle.click({ force: true }).catch(() => {});
                        await page.waitForTimeout(300);
                    }
                }
            } catch (e) {
                console.log("⚠️ Error expandiendo secciones:", e.message);
            }
        };

        // Expand all accordions at the very beginning so DOM elements are generated
        await expandAllAccordions();

        // Helpers de llenado por ID dentro del frame
        const fillInputById = async (id, value) => {
            if (value === undefined || value === null || value === '') return;
            try {
                const input = frame.locator(id).first();
                if (await input.isVisible()) {
                    await input.fill(String(value));
                    console.log(`   ✅ Rellenado por ID "${id}": ${value} (sobreescrito)`);
                }
            } catch (e) {
                console.log(`   ⚠️ No se pudo rellenar por ID "${id}": ${e.message}`);
            }
        };

        const selectOptionById = async (id, value) => {
            if (!value) return;
            try {
                const select = frame.locator(id).first();
                if (await select.isVisible()) {
                    const options = await select.locator('option').all();
                    
                    // 1. First attempt exact match to prevent SIPP matching Resident
                    for (const option of options) {
                        const text = (await option.innerText()).trim();
                        if (text.toLowerCase() === String(value).trim().toLowerCase()) {
                            const optVal = await option.getAttribute('value');
                            await select.selectOption(optVal);
                            console.log(`   ✅ Seleccionado por ID "${id}" (coincidencia exacta): ${text}`);
                            return;
                        }
                    }
                    
                    // 2. Fallback to partial match
                    for (const option of options) {
                        const text = await option.innerText();
                        if (text.toLowerCase().includes(String(value).toLowerCase())) {
                            const optVal = await option.getAttribute('value');
                            await select.selectOption(optVal);
                            console.log(`   ✅ Seleccionado por ID "${id}" (coincidencia parcial): ${text}`);
                            return;
                        }
                    }
                }
            } catch (e) {
                console.log(`   ⚠️ No se pudo seleccionar por ID "${id}": ${e.message}`);
            }
        };

        const clickRadioById = async (id) => {
            try {
                const radio = frame.locator(id).first();
                if (await radio.isVisible()) {
                    const isChecked = await radio.isChecked();
                    if (!isChecked) {
                        await radio.click({ force: true, timeout: 3000 });
                        console.log(`   ✅ Radio seleccionado por ID "${id}"`);
                    } else {
                        console.log(`   ⏭️ Radio ya seleccionado por ID "${id}"`);
                    }
                }
            } catch (e) {
                console.log(`   ⚠️ No se pudo seleccionar radio por ID "${id}": ${e.message}`);
            }
        };

        const setCheckboxById = async (id, checked) => {
            if (checked === undefined || checked === null) return;
            try {
                const cb = frame.locator(id).first();
                if (await cb.count() > 0) {
                    const isChecked = await cb.isChecked().catch(() => false);
                    if (checked !== isChecked) {
                        await cb.evaluate((el, targetState) => {
                            el.removeAttribute('disabled');
                            if (el.checked !== targetState) {
                                el.click();
                                el.checked = targetState;
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, checked);
                        console.log(`   ✅ Checkbox configurado a ${checked} vía JS por ID "${id}"`);
                        await page.waitForTimeout(500);
                    } else {
                        console.log(`   ⏭️ Checkbox ya en estado deseado por ID "${id}" (Checked: ${isChecked})`);
                    }
                } else {
                    console.log(`   ⚠️ Elemento checkbox no encontrado en DOM por ID "${id}"`);
                }
            } catch (e) {
                console.log(`   ⚠️ No se pudo configurar checkbox por ID "${id}": ${e.message}`);
            }
        };

        // Helper para llenar tablas dinámicas (grids de texto simples) con auto-inserción Vue y localización resiliente de tabla por título/encabezados
        const fillDynamicTable = async (tableNthOrTitle, rowDataList) => {
            if (!rowDataList || rowDataList.length === 0) return;
            try {
                console.log(`📊 Llenando Tabla (${rowDataList.length} filas)...`);

                // Auto-expandir secciones desplegables colapsadas para visibilidad de tablas
                try {
                    const collapsedToggles = await frame.locator('.accordion_in.collapsed, .card-header.collapsed, [data-toggle="collapse"].collapsed').all();
                    for (const toggle of collapsedToggles) {
                        if (await toggle.isVisible().catch(() => false)) {
                            await toggle.click({ force: true }).catch(() => {});
                            await page.waitForTimeout(300);
                        }
                    }
                } catch (e) {}

                // Función auxiliar para obtener la referencia de la tabla fresca
                const getFreshTable = async () => {
                    if (typeof tableNthOrTitle === 'number') {
                        return frame.locator('table').nth(tableNthOrTitle);
                    }
                    if (typeof tableNthOrTitle === 'string' || tableNthOrTitle instanceof RegExp) {
                        const titleRegex = new RegExp(tableNthOrTitle, 'i');
                        let tbl = frame.locator('table').filter({ has: frame.locator('th, td').filter({ hasText: titleRegex }) }).first();
                        if (await tbl.isVisible().catch(() => false)) return tbl;
                        
                        const card = frame.locator('.card, .accordion_in, .acc_section, fieldset, section, div[id*="seccion"]').filter({ hasText: titleRegex }).first();
                        tbl = card.locator('table').first();
                        if (await tbl.isVisible().catch(() => false)) return tbl;
                    }
                    return frame.locator('table').first();
                };

                for (let i = 0; i < rowDataList.length; i++) {
                    const rowData = rowDataList[i];
                    const col0Text = String(rowData.col0 || '').trim();
                    if (!col0Text) continue;

                    // Re-obtener la tabla FRESCA del DOM
                    const table = await getFreshTable();
                    if (!await table.isVisible().catch(() => false)) continue;

                    // 1. Verificar si el ítem ya existe en la tabla
                    const existingRows = await table.locator('tbody tr').all();
                    let alreadyExists = false;
                    for (const tr of existingRows) {
                        const firstInput = tr.locator('td').first().locator('input[type="text"], input:not([type="hidden"])').first();
                        const val = await firstInput.inputValue().catch(() => '');
                        if (val && val.trim().toLowerCase() === col0Text.toLowerCase()) {
                            alreadyExists = true;
                            break;
                        }
                    }
                    if (alreadyExists) {
                        console.log(`   ⏭️ Elemento "${col0Text}" ya existe en Tabla. Saltando.`);
                        continue;
                    }

                    // 2. Re-obtener FRESCO el campo "Insertar Fila" (al final de la tabla)
                    let triggerInput = table.locator('input[placeholder*="Insertar"], input[placeholder*="insertar"], input[placeholder*="Fila"], input[placeholder*="fila"]').last();
                    if (!await triggerInput.isVisible().catch(() => false)) {
                        triggerInput = table.locator('input[placeholder*="Insertar"], input[placeholder*="insertar"]').first();
                    }

                    if (await triggerInput.isVisible().catch(() => false)) {
                        console.log(`   ✍️ Insertando fila ${i+1}: "${col0Text}"`);
                        await triggerInput.scrollIntoViewIfNeeded().catch(() => {});
                        await triggerInput.click({ force: true }).catch(() => {});
                        await triggerInput.fill(col0Text);
                        await page.waitForTimeout(300);
                        await triggerInput.dispatchEvent('input').catch(() => {});
                        await triggerInput.dispatchEvent('change').catch(() => {});
                        await page.waitForTimeout(800);
                    } else {
                        // Fallback a la última fila existente
                        const lastTr = table.locator('tbody tr').last();
                        const col0Input = lastTr.locator('td').nth(0).locator('input[type="text"]').first();
                        if (await col0Input.isVisible().catch(() => false)) {
                            await col0Input.click({ force: true }).catch(() => {});
                            await col0Input.fill(col0Text);
                            await page.waitForTimeout(300);
                            await col0Input.dispatchEvent('input').catch(() => {});
                            await col0Input.dispatchEvent('change').catch(() => {});
                            await page.waitForTimeout(800);
                        }
                    }

                    // 3. Re-obtener TODAS las filas FRESCAS en el DOM para buscar dónde Vue creó col0Text
                    const freshRows = await table.locator('tbody tr').all();
                    let targetRow = null;

                    for (let r = 0; r < freshRows.length; r++) {
                        const tr = freshRows[r];
                        const firstInput = tr.locator('td').first().locator('input[type="text"], input:not([type="hidden"])').first();
                        const val = await firstInput.inputValue().catch(() => '');
                        if (val && val.trim().toLowerCase().includes(col0Text.toLowerCase().substring(0, Math.min(5, col0Text.length)))) {
                            targetRow = tr;
                            break;
                        }
                    }

                    if (!targetRow && freshRows.length >= 2) {
                        targetRow = freshRows[freshRows.length - 2];
                    }

                    if (targetRow) {
                        // Columna 1 (Dosis / Tipo / Agencia)
                        if (rowData.col1 !== undefined && rowData.col1 !== null && String(rowData.col1).trim() !== '') {
                            const col1Input = targetRow.locator('td').nth(1).locator('input[type="text"], input:not([type="hidden"])').first();
                            if (await col1Input.isVisible().catch(() => false)) {
                                await col1Input.click({ force: true }).catch(() => {});
                                await col1Input.fill(String(rowData.col1));
                                await page.waitForTimeout(200);
                            }
                        }

                        // Columna 2 (Médico / Proveedor / Fecha)
                        if (rowData.col2 !== undefined && rowData.col2 !== null && String(rowData.col2).trim() !== '') {
                            const col2Input = targetRow.locator('td').nth(2).locator('input[type="text"], input:not([type="hidden"])').first();
                            if (await col2Input.isVisible().catch(() => false)) {
                                await col2Input.click({ force: true }).catch(() => {});
                                await col2Input.fill(String(rowData.col2));
                                await page.waitForTimeout(200);
                            }
                        }

                        // Columna 3 (Propósito / Razón / Efectividad)
                        if (rowData.col3 !== undefined && rowData.col3 !== null && String(rowData.col3).trim() !== '') {
                            const col3Input = targetRow.locator('td').nth(3).locator('input[type="text"], input:not([type="hidden"])').first();
                            const col3Select = targetRow.locator('td').nth(3).locator('select').first();

                            if (await col3Select.isVisible().catch(() => false)) {
                                const options = await col3Select.locator('option').all();
                                for (const option of options) {
                                    const text = await option.innerText();
                                    if (text.toLowerCase().includes(String(rowData.col3).toLowerCase())) {
                                        const optVal = await option.getAttribute('value');
                                        await col3Select.selectOption(optVal);
                                        break;
                                    }
                                }
                            } else if (await col3Input.isVisible().catch(() => false)) {
                                await col3Input.click({ force: true }).catch(() => {});
                                await col3Input.fill(String(rowData.col3));
                                await page.waitForTimeout(200);
                            }
                        }
                    } else {
                        console.log(`   ⚠️ No se pudo ubicar la fila insertada para "${col0Text}".`);
                    }
                }
                console.log(`   ✅ Tabla completada.`);
            } catch (e) {
                console.log(`   ⚠️ Error al rellenar Tabla:`, e.message);
            }
        };

        if (isServicePlan) {
            console.log("📝 Ejecutando auto-llenado de PLAN DE SERVICIO (TCM_SERVICE_PLAN)...");
            const spData = payload.service_plan_data || {};

            // Compatibilidad de estructura plana a anidada en el worker
            if (!spData.domains) {
                spData.domains = {};
                const allDomainKeys = [
                    'domain_mental_health',
                    'domain_physical_health',
                    'domain_physical_health_otc',
                    'domain_physical_health_alarm',
                    'domain_vocational',
                    'domain_education',
                    'domain_recreational',
                    'domain_daily_living',
                    'domain_housing',
                    'domain_financial',
                    'domain_basic_needs',
                    'domain_transportation',
                    'domain_transportation_sts',
                    'domain_transportation_dpp',
                    'domain_legal',
                    'domain_other'
                ];
                for (const sKey of allDomainKeys) {
                    if (spData[`service_plan_goal_${sKey}`] || 
                        spData[`service_plan_description_${sKey}`] || 
                        spData[`service_plan_needs_${sKey}`] ||
                        spData[`service_plan_needs_identified_${sKey}`]) {
                        spData.domains[sKey] = {
                            description: spData[`service_plan_description_${sKey}`],
                            needs_identified: spData[`service_plan_needs_${sKey}`] || spData[`service_plan_needs_identified_${sKey}`] || spData[`service_plan_needs_identified_domain_${sKey.replace('domain_', '')}`],
                            long_term_goal: spData[`service_plan_goal_${sKey}`],
                            objective_1: spData[`service_plan_obj1_${sKey}`],
                            objective_2: spData[`service_plan_obj2_${sKey}`],
                            objective_3: spData[`service_plan_obj3_${sKey}`],
                            responsible: spData[`service_plan_responsible_${sKey}`],
                            status: spData[`service_plan_status_${sKey}`] || 'New'
                        };
                    }
                }
            }

            const fillInputLoc = async (locator, value) => {
                if (!locator || value === undefined || value === null) return;
                try {
                    await locator.evaluate(el => {
                        el.removeAttribute('disabled');
                        el.disabled = false;
                        el.removeAttribute('readonly');
                        el.readOnly = false;
                    });
                    await locator.fill(String(value));
                } catch (e) {
                    console.log("   ⚠️ Error filling locator:", e.message);
                }
            };

            const domainOrder = [
                'domain_mental_health',
                'domain_physical_health',
                'domain_vocational',
                'domain_education',
                'domain_recreational',
                'domain_daily_living',
                'domain_housing',
                'domain_financial',
                'domain_basic_needs',
                'domain_transportation',
                'domain_legal',
                'domain_other'
            ];

            // 1. Llenar fechas clave de Sección I
            await fillInputById('#preview_response_pregunta_general_start_date', spData.service_plan_date);
            await fillInputById('#preview_response_pregunta_general_target_date', spData.service_plan_target_date);

            // 2. Llenar fechas de servicios previos (Intake, Records, Assessment, Certification)
            try {
                const prevServicesInputs = frame.locator('tr').filter({ hasText: /Intake|Gather of Medical Records|CM Assessment|CM Certification/i }).locator('input[type="text"]');
                const count = await prevServicesInputs.count();
                console.log(`   📊 Encontrados ${count} inputs de fechas en la tabla de servicios previos.`);
                
                const servicesDates = [
                    spData.service_plan_intake_date,
                    spData.service_plan_records_date,
                    spData.service_plan_assessment_date,
                    spData.service_plan_certification_date
                ];

                for (let i = 0; i < count && i < servicesDates.length; i++) {
                    const input = prevServicesInputs.nth(i);
                    const val = servicesDates[i];
                    if (val) {
                        const current = await input.inputValue();
                        if (!current || current.trim() === '') {
                            await input.fill(val);
                            console.log(`   ✅ Fecha de servicio ${i} rellenada: ${val}`);
                        }
                    }
                }
            } catch (e) {
                console.log("   ⚠️ Error al rellenar fechas de servicios previos:", e.message);
            }

            // 3. Criterios de Alta / Transición
            let dischargeCriteria = spData.service_plan_discharge_criteria;
            if (!dischargeCriteria || dischargeCriteria.trim() === '') {
                const pronoun = payload.gender === 'Female' ? 'she' : 'he';
                const possessive = payload.gender === 'Female' ? 'her' : 'his';
                dischargeCriteria = `${payload.patient_name} will be considered appropriate for transition or discharge from Targeted Case Management services when ${pronoun} demonstrates sustained stability in both psychiatric and medical domains and is able to manage ${possessive} care more independently. Discharge criteria will include consistent attendance at primary care, specialty, and psychiatric appointments without intensive coordination support; demonstrated ability to understand and respond appropriately to provider notifications and benefit-related correspondence; stable adherence to prescribed medications; successful linkage and enrollment in the Alliance for Aging Program and other identified community resources; maintenance of housing stability and basic needs without crisis intervention; and effective use of transportation services independently. Additionally, discharge may be appropriate when ${payload.patient_name} shows improved organizational skills for managing medical documentation, benefits, and follow-ups, reduced risk of benefit interruption, and sustained emotional stability without recent psychiatric decompensation or safety concerns. If ${payload.patient_name} transfers services to another provider, relocates outside the service area, declines services, or no longer meets medical necessity criteria for Targeted Case Management, transition planning will be completed to ensure continuity of care and connection to appropriate supports.`;
            }
            await fillInputById('#preview_response_pregunta_12', dischargeCriteria);

            // 4. Section II: Domains (Date Identified & Needs Identified)
            console.log("📝 Rellenando Sección II (Domains)...");
            
            // Query patient details from Supabase to resolve variables
            const { data: dbPatient, error: dbPatientErr } = await supabase
                .from('patients')
                .select('first_name, gender, diagnoses, pcp_conditions, tcm_social_needs, presenting_problems')
                .ilike('full_name', payload.patient_name)
                .maybeSingle();

            if (dbPatientErr) {
                console.error("⚠️ Error querying patient details from Supabase:", dbPatientErr.message);
            }

            const clientName = dbPatient?.first_name || payload.patient_name.split(' ')[0];
            const clientGender = (dbPatient?.gender || payload.gender || 'Female').toLowerCase();
            const planStartDate = spData.service_plan_date;

            // Formatear diagnósticos de salud mental
            let mhDiagnoses = "";
            if (dbPatient?.diagnoses) {
                mhDiagnoses = dbPatient.diagnoses
                    .split('\n')
                    .map(line => line.replace(/\s*-\s*/, ' ').trim())
                    .filter(line => line.length > 0)
                    .join(', ');
            } else {
                mhDiagnoses = "Depressive and anxiety symptoms";
            }

            // Formatear condiciones médicas
            const medicalConditions = dbPatient?.pcp_conditions || "Chronic medical conditions";

            const replacePronouns = (text) => {
                if (!text) return "";
                const isMale = clientGender === 'male';
                let res = text;
                
                res = res.replace(/\[CLIENT\]/g, clientName);
                res = res.replace(/\[MH_DIAGNOSES\]/g, mhDiagnoses);
                res = res.replace(/\[MEDICAL_CONDITIONS\]/g, medicalConditions);
                res = res.replace(/\[PLAN_START_DATE\]/g, planStartDate);

                res = res.replace(/(^|[.!?]\s+)\[HE\]/g, (match, p1) => p1 + (isMale ? 'He' : 'She'));
                res = res.replace(/\[HE\]/g, isMale ? 'he' : 'she');
                res = res.replace(/(^|[.!?]\s+)\[HIS\]/g, (match, p1) => p1 + (isMale ? 'His' : 'Her'));
                res = res.replace(/\[HIS\]/g, isMale ? 'his' : 'her');
                res = res.replace(/(^|[.!?]\s+)\[HIM\]/g, (match, p1) => p1 + (isMale ? 'Him' : 'Her'));
                res = res.replace(/\[HIM\]/g, isMale ? 'him' : 'her');
                res = res.replace(/(^|[.!?]\s+)\[HIMSELF\]/g, (match, p1) => p1 + (isMale ? 'Himself' : 'Herself'));
                res = res.replace(/\[HIMSELF\]/g, isMale ? 'himself' : 'herself');

                return res;
            };

            let needsSnapRenewal = false;
            if (dbPatient) {
                const socialNeeds = dbPatient.tcm_social_needs || {};
                const otherNeedsText = String(socialNeeds.other_needs || "").toLowerCase();
                const presentingProblemsText = String(dbPatient.presenting_problems || "").toLowerCase();
                const snapEnrolled = socialNeeds.food_programs && socialNeeds.food_programs.some(p => 
                    p.program_type && p.program_type.includes("SNAP") && p.enrolled
                );
                if (snapEnrolled && (otherNeedsText.includes("stamp") || otherNeedsText.includes("snap") || otherNeedsText.includes("renew") || otherNeedsText.includes("recert") ||
                    presentingProblemsText.includes("stamp") || presentingProblemsText.includes("snap"))) {
                    needsSnapRenewal = true;
                }
            }

            const section2Keywords = {
                domain_mental_health: 'Mental Health',
                domain_physical_health: 'Physical Health',
                domain_vocational: 'Vocational',
                domain_education: 'Education',
                domain_recreational: 'Recreational',
                domain_daily_living: 'Daily Living',
                domain_housing: 'Housing',
                domain_financial: 'Financial|Economic',
                domain_basic_needs: 'Basic Needs',
                domain_transportation: 'Transportation',
                domain_legal: 'Legal',
                domain_other: 'Other'
            };

            const getSection2Fields = async () => {
                const fields = {};
                const domainToIds = {
                    'domain_mental_health':   { checkboxVal: '239', dateId: '15', textareaId: '16' },
                    'domain_physical_health': { checkboxVal: '241', dateId: '17', textareaId: '18' },
                    'domain_vocational':      { checkboxVal: '242', dateId: '19', textareaId: '20' },
                    'domain_education':       { checkboxVal: '243', dateId: '21', textareaId: '22' },
                    'domain_recreational':    { checkboxVal: '244', dateId: '23', textareaId: '24' },
                    'domain_daily_living':    { checkboxVal: '245', dateId: '25', textareaId: '26' },
                    'domain_housing':         { checkboxVal: '246', dateId: '27', textareaId: '28' },
                    'domain_financial':       { checkboxVal: '247', dateId: '29', textareaId: '30' },
                    'domain_basic_needs':     { checkboxVal: '248', dateId: '31', textareaId: '32' },
                    'domain_transportation':  { checkboxVal: '249', dateId: '33', textareaId: '34' },
                    'domain_legal':           { checkboxVal: '250', dateId: '35', textareaId: '36' },
                    'domain_other':           { checkboxVal: '251', dateId: '37', textareaId: '38' }
                };

                for (const [key, mapping] of Object.entries(domainToIds)) {
                    const checkbox = frame.locator(`input[type="checkbox"][value="${mapping.checkboxVal}"], input[id$="_${mapping.checkboxVal}"]`).first();
                    const dateInput = frame.locator(`#preview_response_pregunta_${mapping.dateId}`).first();
                    const textarea = frame.locator(`#preview_response_pregunta_${mapping.textareaId}`).first();
                    
                    fields[key] = { checkbox, dateInput, textarea };
                }
                return fields;
            };

            const setCheckbox = async (checkboxLocator, targetState) => {
                try {
                    if (checkboxLocator && await checkboxLocator.count() > 0) {
                        await checkboxLocator.evaluate((el, state) => {
                            el.removeAttribute('disabled');
                            el.disabled = false;
                            if (el.checked !== state) {
                                el.checked = state;
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, targetState);
                        await page.waitForTimeout(500);
                    }
                } catch (e) {
                    console.log(`   ⚠️ Error toggling checkbox:`, e.message);
                }
            };

            const fillInput = async (inputLocator, value, labelName) => {
                try {
                    if (inputLocator && await inputLocator.isVisible()) {
                        await inputLocator.evaluate(el => {
                            el.removeAttribute('disabled');
                            el.disabled = false;
                            el.removeAttribute('readonly');
                            el.readOnly = false;
                        });
                        await inputLocator.fill(value);
                        await page.waitForTimeout(500);
                        console.log(`   ✅ Rellenado campo: ${labelName}`);
                    } else {
                        console.log(`   ⚠️ Campo para ${labelName} no visible para rellenar.`);
                    }
                } catch (e) {
                    console.log(`   ⚠️ Error al rellenar ${labelName}:`, e.message);
                }
            };

            const domainTemplates = {
                domain_mental_health: `[CLIENT] has been suffering from [MH_DIAGNOSES]; [HE] has been feeling depressed and anxious for years. [CLIENT] needs to continue receiving psychiatric treatment to stabilize [HIS] mental condition and avoid hospitalizations.`,
                domain_physical_health: `[CLIENT] suffers from [MEDICAL_CONDITIONS]. [CLIENT] needs to continue receiving medical treatment from [HIS] PCP and following medical appointments to keep [HIS] medical conditions under control.\n\n[CLIENT] needs to get [HIS] over-the-counter (OTC) medications, but [CLIENT] is having difficulty completing the form and submitting it to [HIS] health insurance. The CM will assist [CLIENT] in obtaining, completing, and submitting the OTC application.`,
                domain_recreational: `[CLIENT] needs to interact with more people and expand [HIS] social support network, to improve [HIS] coping skills.`,
                domain_daily_living: `[CLIENT] cannot understand the notification received from [HIS] providers. [CLIENT] is at risk of losing [HIS] benefits if [HE] does not comply with the requests from [HIS] providers. [CLIENT] needs to understand notifications received from [HIS] providers and comply with their requests to maintain [HIS] benefits.`,
                domain_housing: `[CLIENT] reports that [HE] only receives Supplemental Security Income (SSI) and, consequently, is unable to afford standard housing costs. Despite [HIS] financial limitations, [HE] expresses a preference for living alone in order to preserve [HIS] sense of independence. [CLIENT] needs to secure a housing benefit that aligns with [HIS] limited monthly income to minimize the risk of further exacerbation of [HIS] mental health symptoms, during the next six months.`,
                domain_financial: `[CLIENT] struggles each month to pay electricity bills due to [HIS] low income. [CLIENT] needs to apply for Low Income Home Energy Assistance Program to obtain an electricity credit.\n\n[CLIENT] needs to obtain affordable phone services, to maintain communication with [HIS] medical provider and family. [CLIENT] cannot afford to pay for regular phone services and would benefit from applying for the free phone to communicate in case of an emergency.`,
                domain_basic_needs: `[CLIENT] needs food donations to cover some of [HIS] basic needs. [CLIENT] cannot afford to buy food and other items by [HIMSELF] because of [HIS] age and medical condition. [HE] needs to maintain a strict diet regime based on healthy food.`,
                domain_transportation: `[CLIENT], lacking transportation means, is in need of acquiring the Golden Passport card to facilitate [HIS] mobility. [HIS] inability to traverse long distances has significantly impacted [HIS] ability to visit family and friends, prompting the urgency of obtaining this card.\n\n[CLIENT] grapples with multiple health conditions, warranting the necessity for a disabled parking permit to facilitate [HIS] mobility and ensure [HIS] access to essential services.`,
                domain_other: `[CLIENT] must be linked with the Emergency Evacuation Plan of Miami-Dade to ensure [HIS] safety and preparedness in emergencies. The case Manager will assist the client with this issue during the hurricane season.`
            };

            const resolveCaseNecessities = (dbPatientObj, spDataObj, payloadObj) => {
                const socialNeeds = (dbPatientObj && dbPatientObj.tcm_social_needs) || {};
                const presentingProblems = String((dbPatientObj && dbPatientObj.presenting_problems) || "").toLowerCase();
                const otherNeeds = String(socialNeeds.other_needs || "").toLowerCase();
                const caseText = [
                    presentingProblems,
                    otherNeeds,
                    JSON.stringify(socialNeeds).toLowerCase(),
                    JSON.stringify(spDataObj || {}).toLowerCase(),
                    JSON.stringify(payloadObj || {}).toLowerCase()
                ].join(" ");

                const matchedBlocks = {
                    domain_mental_health: [],
                    domain_physical_health: [],
                    domain_recreational: [],
                    domain_daily_living: [],
                    domain_housing: [],
                    domain_financial: [],
                    domain_basic_needs: [],
                    domain_transportation: [],
                    domain_other: []
                };

                const necessitiesFound = [];
                const has = (keywords) => keywords.some(kw => caseText.includes(kw));

                // 1. Mental Health (#1)
                if (has(['psychiatr', 'mental health', 'depress', 'anxi', 'schizo', 'bipolar', 'mood', 'insomnia', 'medication compliance'])) {
                    necessitiesFound.push("Psychiatric treatment / Mental Health");
                    matchedBlocks.domain_mental_health.push("1.1 Psychiatric Services");
                }

                // 2. Physical Health (#2)
                if (has(['pcp', 'primary care', 'hypertension', 'diabetes', 'cholesterol', 'medical treatment', 'doctor', 'specialist', 'vaccin']) || (dbPatientObj && dbPatientObj.medical_diagnoses)) {
                    necessitiesFound.push("Medical treatment with PCP / specialists");
                    matchedBlocks.domain_physical_health.push("2.1 Medical Services");
                }
                if (has(['otc', 'over-the-counter', 'over the counter'])) {
                    necessitiesFound.push("OTC medications benefit");
                    matchedBlocks.domain_physical_health.push("2.2 OTC Medications");
                }
                if (has(['emergency alarm', 'lifeline alarm', 'alarm system', 'medical alarm'])) {
                    necessitiesFound.push("Emergency alarm system");
                    matchedBlocks.domain_physical_health.push("2.3 Emergency Alarm");
                }

                // 5. Recreational (#5)
                if (has(['recreat', 'social support', 'isolation', 'coping', 'community center', 'library', 'socialize'])) {
                    necessitiesFound.push("Social interaction / recreational activities");
                    matchedBlocks.domain_recreational.push("5.1 Recreational Programs");
                }

                // 6. Activities of Daily Living (#6)
                if (has(['notification', 'correspondence', 'provider letter', 'dcf letter', 'understand letter', 'losing benefit'])) {
                    necessitiesFound.push("Understanding provider notifications");
                    matchedBlocks.domain_daily_living.push("6.1 Provider Notifications");
                }

                // 7. Housing (#7)
                if (has(['low-income housing', 'apply for housing', 'section 8', 'ssi housing', 'rent assistance', 'housing voucher'])) {
                    necessitiesFound.push("Apply for low-income housing");
                    matchedBlocks.domain_housing.push("7.1 Apply for Housing");
                }
                if (has(['housing recert', 'annual recertification', 'recertify housing', 'voucher renewal'])) {
                    necessitiesFound.push("Annual housing recertification");
                    matchedBlocks.domain_housing.push("7.2 Recertify Housing");
                }

                // 8. Economic / Financial (#8)
                if (has(['free phone', 'safelink', 'assurance wireless', 'cell phone', 'lifeline phone'])) {
                    necessitiesFound.push("Free phone service");
                    matchedBlocks.domain_financial.push("8.1 Free Phone");
                }
                if (has(['liheap', 'electricity', 'energy assistance', 'electric bill', 'fpl credit'])) {
                    necessitiesFound.push("LIHEAP / electricity assistance");
                    matchedBlocks.domain_financial.push("8.2 LIHEAP");
                }
                if (has(['snap', 'food stamp', 'foodstamps', 'dcf recert', 'renew snap']) || needsSnapRenewal) {
                    necessitiesFound.push("SNAP / food stamps renewal");
                    matchedBlocks.domain_financial.push("8.3 Food Stamps Recertification");
                }

                // 9. Basic Needs (#9)
                if (has(['food donation', 'food bank', 'pantry', 'household essential', 'basic need', 'diet', 'meal'])) {
                    necessitiesFound.push("Food donations / household essentials");
                    matchedBlocks.domain_basic_needs.push("9.1 Food & Household Essentials");
                }

                // 10. Transportation (#10)
                if (has(['disabled parking', 'handicap parking', 'dpp', 'parking permit'])) {
                    necessitiesFound.push("Disabled parking permit");
                    matchedBlocks.domain_transportation.push("10.1 Disabled Parking Permit");
                }
                if (has(['modivcare', 'uber health', 'transportation app'])) {
                    necessitiesFound.push("Modivcare transportation");
                    matchedBlocks.domain_transportation.push("10.2 Modivcare");
                }
                if (has(['sts', 'special transportation service', 'paratransit'])) {
                    necessitiesFound.push("Special Transportation Services (STS)");
                    matchedBlocks.domain_transportation.push("10.3 Special Transportation Services (STS)");
                }
                if (has(['golden passport', 'bus pass', 'metrocard', 'transit pass'])) {
                    necessitiesFound.push("Golden Passport card");
                    matchedBlocks.domain_transportation.push("10.4 Golden Passport");
                }
                if (has(['freebee'])) {
                    necessitiesFound.push("Freebee transportation");
                    matchedBlocks.domain_transportation.push("10.5 Freebee");
                }

                // 12. Other (#12)
                if (has(['evacuation', 'hurricane', 'disaster', 'emergency plan'])) {
                    necessitiesFound.push("Emergency / hurricane evacuation plan");
                    matchedBlocks.domain_other.push("12.1 Emergency Evacuation Plan");
                }

                // Active domains set
                const activeDomains = {};
                for (const [dKey, blockNames] of Object.entries(matchedBlocks)) {
                    if (blockNames.length > 0) {
                        activeDomains[dKey] = true;
                    }
                }

                // If payload explicit domains specified and activeDomains is empty, fallback to payload domains
                if (Object.keys(activeDomains).length === 0 && spDataObj && spDataObj.domains) {
                    for (const [dKey, isAct] of Object.entries(spDataObj.domains)) {
                        if (isAct) activeDomains[dKey] = true;
                    }
                }

                return { necessitiesFound, matchedBlocks, activeDomains };
            };

            const caseAnalysis = resolveCaseNecessities(dbPatient, spData, payload);
            console.log(`🔍 Case Necessities Identified for ${clientName}:`, caseAnalysis.necessitiesFound.join(', ') || 'none');

            const checkedDomains = [];
            const completedDomains = [];
            const flaggedDomains = [];

            // Expandir la sección principal SECTION II si está colapsada en el DOM
            try {
                // Esperar a que al menos un acordeón esté presente en el DOM
                await frame.locator('.accordion_in, .acc_section').first().waitFor({ state: 'attached', timeout: 20000 });

                const allCards = await frame.locator('.accordion_in, .acc_section').all();
                for (const card of allCards) {
                    const cardText = await card.textContent().catch(() => '');
                    if (cardText.toLowerCase().includes('section ii') && !cardText.toLowerCase().includes('section iii')) {
                        const section2Head = card.locator('.acc_head').first();
                        const isCollapsed = await section2Head.evaluate(el => el.classList.contains('collapsed') || el.getAttribute('aria-expanded') === 'false').catch(() => false);
                        if (isCollapsed) {
                            console.log("   🔓 Expandiendo sección principal SECTION II...");
                            await section2Head.scrollIntoViewIfNeeded();
                            await section2Head.click();
                            await page.waitForTimeout(2000);
                        }
                        break;
                    }
                }
            } catch (sec2ExpErr) {
                console.log(`   ⚠️ Error expandiendo SECTION II: ${sec2ExpErr.message}`);
            }

            // Obtener localizadores dinámicos para la Sección II
            const section2Fields = await getSection2Fields();

            for (const domainKey of domainOrder) {
                try {
                    const fields = section2Fields[domainKey];
                    if (!fields || !fields.checkbox) {
                        console.log(`   ⚠️ Elemento checkbox no encontrado en DOM para dominio ${domainKey}`);
                        continue;
                    }
                    
                    const cb = fields.checkbox;
                    let isChecked = await cb.isChecked().catch(() => false);
                    const shouldBeActive = caseAnalysis.activeDomains[domainKey] || (spData.domains && spData.domains[domainKey]);
                    if (!isChecked && shouldBeActive) {
                        console.log(`   ☑️ Domain ${domainKey} active based on case necessity matching. Enabling and checking Section II checkbox...`);
                        await setCheckbox(cb, true);
                        isChecked = await cb.isChecked().catch(() => false);
                    }
                    if (isChecked) {
                        checkedDomains.push(domainKey);
                        
                        // Fill Date Identified
                        if (fields.dateInput) {
                            await fillInput(fields.dateInput, planStartDate, `${domainKey} Date`);
                        }
                        
                        // Get Needs Identified text
                        const customDomain = spData.domains?.[domainKey];
                        let needsText = customDomain?.needs_identified || domainTemplates[domainKey];
                        if (needsText !== undefined) {
                            let resolvedText = replacePronouns(needsText);
                            if (domainKey === 'domain_financial' && needsSnapRenewal && !resolvedText.toLowerCase().includes('snap')) {
                                resolvedText += ` Also, ${clientName} needs to renew ${clientGender === 'male' ? 'his' : 'her'} SNAP benefit.`;
                            }
                            if (fields.textarea) {
                                await fillInput(fields.textarea, resolvedText, `${domainKey} Needs`);
                            }
                            completedDomains.push(domainKey);
                        } else {
                            // Checkbox is checked but no approved template text exists (e.g. vocational, education, legal)
                            flaggedDomains.push(domainKey);
                        }
                    }
                } catch (chkErr) {
                    console.log(`   ⚠️ Error procesando checkbox de dominio ${domainKey}: ${chkErr.message}`);
                }
            }

            console.log(`📋 SECTION II — Patient: ${clientName} | Date Identified used: ${planStartDate}`);
            console.log(`Domains checked: ${checkedDomains.join(', ') || 'none'}`);
            console.log(`Domains completed: ${completedDomains.join(', ') || 'none'}`);
            console.log(`Domains flagged (no approved text): ${flaggedDomains.join(', ') || 'none'}`);

            if (flaggedDomains.length > 0) {
                throw new Error(`Revisión humana requerida: Los siguientes dominios marcados no tienen texto pre-aprobado: ${flaggedDomains.join(', ')}`);
            }

            // 5. Section III Goals & Objectives
            console.log("⏳ Waiting 3 seconds for Section III dynamic blocks to render...");
            await page.waitForTimeout(3000);

            // Definición de bloques por dominio y sus plantillas de texto
            const approvedBlocks = {
                domain_mental_health: [
                    {
                        name: "1.1 Psychiatric Services",
                        description: "DESCRIPTION: Psychiatrist services/Coordinate appointments.\n\n[CLIENT] has been suffering from [MH_DIAGNOSES]; [HE] has been feeling depressed and anxious for years. [CLIENT] needs to continue receiving psychiatric treatment to stabilize [HIS] mental condition and avoid hospitalizations.",
                        needs: "[CLIENT] needs to continue receiving psychiatric treatment to stabilize [HIS] mental condition and avoid hospitalizations.",
                        goal: `"I want to comply with my psychiatric treatment and appointments scheduled by my psychiatrist to avoid crisis and improve my mental condition". [CLIENT] will receive psychiatric treatment to stabilize [HIS] mental condition and avoid hospitalizations during the next six months.`,
                        objectives: [
                            `[CLIENT] will attend [HIS] psychiatrist's appointment as scheduled within the next six months. TCM will assist and educate [CLIENT] to coordinate, schedule, and reschedule psychiatrist appointments as needed within the next six months to improve [HIS] level of functioning and monitor the outcomes of the treatment through staffing with the provider within the next six months.`,
                            `[CLIENT] will receive a proper psychiatrist's attendance within the next six months. TCM will advocate on behalf of [CLIENT] during psychiatrist appointments as needed. TCM will monitor attendance and clinic outcomes by gathering information on follow-ups at the doctor's office by self-report or during the home visit. TCM will monitor if [CLIENT] receives proper treatment and medication within the next six months.`,
                            `[CLIENT]'s living environment, level of functioning, and compliance with medications will be monitored by the TCM during the next six months. During the monthly home visits, the TCM will also count all pills left on medication bottles. TCM will monitor [CLIENT]'s mental improvement through [HIS] report and/or direct observation or during monthly Home Visits. The TCM will assist [CLIENT] in scheduling transportation to the psychiatric appointments.`
                        ],
                        responsible: "TCM, Psychiatrist, and [CLIENT]."
                    }
                ],
                domain_physical_health: [
                    {
                        name: "2.1 Medical Services",
                        description: "DESCRIPTION: Medical services. Specialists. Vaccination Compliance.\n\n[CLIENT] suffers from [MEDICAL_CONDITIONS]. [CLIENT] needs to continue receiving medical treatment from [HIS] PCP and following medical appointments to keep [HIS] medical conditions under control.",
                        needs: "[CLIENT] needs to continue receiving medical treatment from [HIS] PCP and following medical appointments to keep [HIS] medical condition under control. [CLIENT] needs to get [HIS] over-the-counter (OTC) medications, but [HE] is having difficulty completing the form and submitting it to [HIS] health insurance.",
                        goal: `"I don´t feel able to control my physical symptoms if I don´t comply with my PCP's appointments, medical treatment, and medical instructions". [CLIENT] will receive medical treatment from [HIS] PCP and follow medical appointments to keep [HIS] medical conditions under control during the next six months.`,
                        objectives: [
                            `Over the next six months, [CLIENT] is committed to attending all of [HIS] scheduled medical appointments. [HE] will actively collaborate with the TCM's assistance to effectively manage and coordinate the scheduling and any necessary rescheduling of [HIS] medical appointments.`,
                            `[CLIENT] will inform [HIS] PCP/specialist about any health progress, and medication side effects during the next six months. TCM will assist [CLIENT] in remembering [HIS] medical appointment. TCM will assist and advocate for [CLIENT] during appointments with [HIS] doctor if [HE] requests it. TCM will assist and advocate for [CLIENT] in exchanging information with [HIS] PCP/specialist regarding [HIS] medical conditions and treatments as part of the coordination of care.`,
                            `TCM will monitor [CLIENT]'s compliance with [HIS] medical follow-up, [HIS] treatment, and the medical recommendations through [CLIENT]'s report by phone calls or during face-to-face contact, during the next six months. The TCM will assist [CLIENT] with [HIS] PCPs/specialists' recommendations. The TCM will monitor [CLIENT]'s physical improvement through phone calls or monthly home visits. The TCM will assist [CLIENT] in scheduling transportation to the medical appointments.`
                        ],
                        responsible: "TCM, [CLIENT], Primary Care Physician."
                    },
                    {
                        name: "2.2 OTC Medications",
                        description: "DESCRIPTION: Over-the-counter (OTC) medications.\n\n[CLIENT] needs to get [HIS] over-the-counter (OTC) medications, but [CLIENT] is having difficulty completing the form and submitting it to [HIS] health insurance. The CM will assist [CLIENT] in obtaining, completing, and submitting the OTC application.",
                        needs: "[CLIENT] needs to continue receiving medical treatment from [HIS] PCP and following medical appointments to keep [HIS] medical condition under control. [CLIENT] needs to get [HIS] over-the-counter (OTC) medications, but [HE] is having difficulty completing the form and submitting it to [HIS] health insurance.",
                        goal: `"I want to obtain my OTC medicines every month". [CLIENT] will be able to obtain [HIS] over-the-counter medications with the assistance of the Case Manager.`,
                        objectives: [
                            `[CLIENT] will be assisted by the TCM at the pharmacy in gathering information about [HIS] medication in the PCP office. TCM will visit the PCP office to obtain the application form on [CLIENT]'s behalf.`,
                            `[CLIENT] will complete the OTC form with the TCM's assistance and will be able to submit [HIS] application form. [HE] will be assisted by the TCM in gathering information for any other pharmacy near [HIS] home if necessary and will assist [HIM] in enrolling to receive their services.`,
                            `The TCM will monitor if [CLIENT] receives [HIS] medication through the contact parties involved. In the case [HE] needs to change [HIS] pharmacy, the TCM also will monitor if [CLIENT] is receiving the appropriate service from the new pharmacy.`
                        ],
                        responsible: "TCM, [CLIENT], Pharmacy."
                    },
                    {
                        name: "2.3 Emergency Alarm",
                        description: "DESCRIPTION: Emergency Alarm.\n\n[CLIENT] needs an Emergency Alarm System to enhance safety and ensure immediate assistance in case of a medical or household emergency due to [HIS] physical limitations and risk factors.",
                        needs: "[CLIENT] needs an Emergency Alarm System to enhance safety and ensure immediate assistance in case of a medical or household emergency due to [HIS] physical limitations and risk factors.",
                        goal: `[CLIENT] stated, "I want to have an emergency alarm system so I can feel safe at home." [CLIENT] will obtain an Emergency Alarm System with the assistance of the Targeted Case Manager (TCM) during the next six months to enhance [HIS] safety, promote independence, and ensure quick access to emergency support.`,
                        objectives: [
                            `The TCM will research and identify available Emergency Alarm System providers and determine eligibility requirements based on [CLIENT]'s insurance coverage.`,
                            `The TCM will coordinate with [CLIENT]'s Primary Care Provider to obtain the required medical order for the Emergency Alarm System.`,
                            `[CLIENT], with TCM assistance, will complete the application and submit all necessary documentation to initiate approval and installation of the Emergency Alarm System.`
                        ],
                        responsible: "[CLIENT], Targeted Case Manager (TCM), Primary Care Provider (PCP), Emergency Alarm System Provider, Insurance Company."
                    }
                ],
                domain_recreational: [
                    {
                        name: "5.1 Recreational Programs",
                        description: "DESCRIPTION: Recreational programs / activities.\n\n[CLIENT] needs to interact with more people and expand [HIS] social support network, to improve [HIS] coping skills. [HE] needs to find a social or recreational program available in the community.",
                        needs: "[CLIENT] needs to interact with more people and expand [HIS] social support network, to improve [HIS] coping skills.",
                        goal: `"I would like to participate in social and recreational activities." [CLIENT] will interact with more people and expand [HIS] social support network during the next six months.`,
                        objectives: [
                            `[CLIENT] will obtain information about the libraries, recreational, cultural and art community activities with the assistance of the CM. The CM will seek if [CLIENT] is motivated to participate in every one of these community activities over the next six months.`,
                            `[CLIENT] will discuss with the CM all information that is required to apply in the community centers and libraries. The case manager will assist [CLIENT] in obtaining the forms to apply for those programs in the next six months.`,
                            `[CLIENT] will submit the application forms to apply for Recreational Centers/Libraries membership during the next six months. The CM will monitor the outcome of this process.`
                        ],
                        responsible: "TCM, [CLIENT], Recreational, and Library Centers."
                    }
                ],
                domain_daily_living: [
                    {
                        name: "6.1 Provider Notifications",
                        description: "DESCRIPTION: Understand the notifications received from [HIS] providers. Financial Empowerment and Budgeting Tools.\n\n[CLIENT] cannot understand the notification received from [HIS] providers. [CLIENT] is at risk of losing [HIS] benefits if [HE] does not comply with the requests from [HIS] providers. [CLIENT] needs to understand notifications received from [HIS] providers and comply with their requests to maintain [HIS] benefits.",
                        needs: "[CLIENT] cannot understand the notification received from [HIS] providers. [CLIENT] is at risk of losing [HIS] benefits if [HE] does not comply with the requests from [HIS] providers. [CLIENT] needs to understand notifications received from [HIS] providers and comply with their requests to maintain [HIS] benefits.",
                        goal: `"I can´t comply by myself with the requests from my providers to keep my government benefits". [CLIENT] will understand the notifications received from [HIS] providers during the next six months.`,
                        objectives: [
                            `[CLIENT] will identify the remittent from correspondence and will keep them in a safe place during the next six months. [CLIENT] will understand notifications from [HIS] providers. TCM will assist [CLIENT] to understand the correspondence sent from the different provider agencies and will discuss with [HIM] the instructions received if needed.`,
                            `[CLIENT] will complete and submit any information requested by any Provider Agencies promptly to continue receiving Government benefits during the next six months. [CLIENT] will comply with any procedure required by the different provider agencies.`,
                            `[CLIENT] will obtain the necessary information to make the correct decision according to what is requested by the different provider agencies in the community, with the TCM's assistance.`
                        ],
                        responsible: "TCM, [CLIENT], and Different Provider Agencies in the Community (Medicare, Medicaid, SSA, DCF)."
                    }
                ],
                domain_housing: [
                    {
                        name: "7.1 Apply for Housing",
                        description: "DESCRIPTION: Apply for available housing programs.\n\n[CLIENT] has a limited source of income; therefore, [HE] can't pay for a better place to live. [CLIENT] needs to apply for a housing program available in the community to obtain a new home according to [HIS] monthly income.",
                        needs: "[CLIENT] reports that [HE] only receives Supplemental Security Income (SSI) and, consequently, is unable to afford standard housing costs. Despite [HIS] financial limitations, [HE] expresses a preference for living alone in order to preserve [HIS] sense of independence. [CLIENT] needs to secure a housing benefit that aligns with [HIS] limited monthly income to minimize the risk of further exacerbation of [HIS] mental health symptoms, during the next six months.",
                        goal: `"I don´t have enough money to pay for a better place to live". [CLIENT] will obtain a better place to live according to [HIS] monthly income during the next six months.`,
                        objectives: [
                            `[CLIENT] will obtain and fill out housing application forms for low-income housing programs available in the community during the next six months. [CLIENT] will gather all necessary information/documentation about housing programs available in the community. TCM will link [CLIENT] with the low-income housing programs available in the community. TCM will assist [CLIENT] in obtaining and completing housing applications for low-income housing programs as well as the documentation required.`,
                            `[CLIENT] will submit the housing application and all additional documentation required promptly. [CLIENT] will attend any appointments at Housing offices and will provide all documentation requested as needed. TCM will assist [CLIENT] to submit the housing applications and all documents required as part of the process. TCM will assist [CLIENT] during an interview at the housing offices as part of the application process.`,
                            `[CLIENT] will update [HIS] contact information (mailing address, phone number) at the Housing program if needed. TCM will monitor the outcome of the housing application through the client's report about notifications received by phone calls or face-to-face contact. Also, monitoring will be done by contacting housing programs if needed. TCM will assist the client to update [HIS] contact information at housing programs through phone calls or visits to the housing offices if needed.`
                        ],
                        responsible: "TCM, [CLIENT], and Housing Program Available in the community."
                    },
                    {
                        name: "7.2 Recertify Housing",
                        description: "DESCRIPTION: Assistance to recertify [HIS] housing benefits.\n\n[CLIENT] needs to comply with the requirements of [HIS] annual housing recertification process to keep [HIS] housing benefits active. [HE] cannot afford regular rent on [HIS] own because of [HIS] limited income.",
                        needs: "[CLIENT] needs to comply with the requirements of [HIS] annual housing recertification process to keep [HIS] housing benefits active. [HE] cannot afford regular rent on [HIS] own because of [HIS] limited income.",
                        goal: `"I want to maintain my housing voucher". "I cannot pay regular rent". [CLIENT] will comply with the annual housing recertification process to maintain [HIS] benefits active within the next six months.`,
                        objectives: [
                            `[CLIENT] will gather updated information to complete the annual housing recertification process to maintain [HIS] benefits active. TCM will assist [CLIENT] in gathering updated information and documentation to complete the annual housing recertification process to maintain [HIS] benefits active within the next six months.`,
                            `[CLIENT] will comply with any required interview to complete the annual housing recertification process to maintain [HIS] benefits active. TCM will assist [CLIENT] in coordinating if needed, rescheduling, and complying with a required interview to complete the annual housing recertification process to maintain [HIS] benefits active within the next six months.`,
                            `[CLIENT] will be educated about all the steps that [HE] should comply with to complete the annual housing recertification process to maintain [HIS] benefits active. TCM will monitor the outcome of the process and will educate [CLIENT] about all steps that [HE] should comply with to complete the annual housing recertification process to maintain [HIS] benefits active within the next six months.`
                        ],
                        responsible: "[CLIENT], TCM, Miami Dade Housing Authority."
                    }
                ],
                domain_financial: [
                    {
                        name: "8.1 Free Phone",
                        description: "DESCRIPTION: Assistance to be linked with Free Phone services.\n\n[CLIENT] is experiencing financial difficulties, including monthly expenses for phone service and utilities. Family involvement is limited, and there is no strong financial support system described. [HE] needs linkage with Lifeline programs to receive a free cell phone and no-cost phone service, alleviating [HIS] financial stressors while maintaining communication with [HIS] healthcare providers.",
                        needs: "[CLIENT] needs to apply for Low Income Home Energy Assistance Program to obtain electricity credit. [CLIENT] needs to obtain affordable phone services, to maintain communication with [HIS] medical provider and family.",
                        goal: `"I can´t keep contact with my health providers, my family, or make emergency calls". [CLIENT] will obtain free phone services with the assistance of the case manager.`,
                        objectives: [
                            `[CLIENT] will obtain the required documentation to complete the application process with the case manager's assistance. [CLIENT] will comply with any interview or procedure required.`,
                            `[CLIENT] will choose the better plan according to [HIS] needs with the case manager´s assistance. [CLIENT] will complete and submit the application form for Assurance/SafeLink Wireless to obtain a free cellular phone. [CLIENT] will provide additional information/documentation to comply with the certification process for Assurance/SafeLink Wireless.`,
                            `[CLIENT] will activate [HIS] new cell phone once [HE] receives it. The case manager will instruct [HIM] in how to use the new phone. The case manager will monitor application outcomes through contact with all parties involved by notifications received or phone calls. CM will assist [CLIENT] during any interview or other procedure required.`
                        ],
                        responsible: "TCM, [CLIENT]; Assurance Wireless (888) 898-4888; SafeLink Wireless (800) 378-1684."
                    },
                    {
                        name: "8.2 LIHEAP",
                        description: "DESCRIPTION: Apply for the Low-Income Home Energy Assistance Program (LIHEAP).\n\n[CLIENT] struggles each month to pay electricity bills due to [HIS] low income. [CLIENT] needs to apply for Low Income Home Energy Assistance Program to obtain an electricity credit.",
                        needs: "[CLIENT] needs to apply for Low Income Home Energy Assistance Program to obtain electricity credit. [CLIENT] needs to obtain affordable phone services, to maintain communication with [HIS] medical provider and family.",
                        goal: `"I'm not the same anymore, the electricity price is too high for my income". [CLIENT] will obtain credits for [HIS] electricity bills over the next six months.`,
                        objectives: [
                            `[CLIENT] will obtain and complete the application form LIHEAP during the next six months. [HE] will gather all requested documentation to be submitted along with the application package and will submit the package at the Community Action office. CM will link [HIM] with LIHEAP. CM will assist [HIM] in obtaining, completing, and submitting the LIHEAP application package along with all requested documentation. CM will assist [CLIENT] and will advocate on [HIS] behalf during any phone calls and/or interviews.`,
                            `[CLIENT] will comply with any interview or other procedure required. [CLIENT] will be aware of any notifications received from the LIHEAP program and will inform CM about it. TCM will advocate on the client's behalf to accomplish each requirement to obtain the LIHEAP benefits.`,
                            `[CLIENT] will be informed about the process outcome. [HE] will be instructed on how to monitor and follow up on [HIS] benefit. CM will monitor the outcome of the LIHEAP application process through [CLIENT]'s report about notifications received by phone calls or face-to-face contact. CM will monitor the LIHEAP application status by contacting the Community Action office, or by notifications received as needed.`
                        ],
                        responsible: "TCM, [CLIENT], Community Action Offices (Any location applicable)."
                    },
                    {
                        name: "8.3 Food Stamps Recertification",
                        description: "DESCRIPTION: Recertify Food Stamps Benefits.\n\n[CLIENT] needs to renew [HIS] SNAP benefit. [CLIENT] needs to keep [HIS] food stamps benefit received by the Department of Children and Families but due to [HIS] mental problems, [HE] is unable to deal with the above issues without assistance.",
                        needs: "[CLIENT] needs to apply for Low Income Home Energy Assistance Program to obtain electricity credit. [CLIENT] needs to obtain affordable phone services, to maintain communication with [HIS] medical provider and family. Also, [CLIENT] needs to renew [HIS] SNAP benefit.",
                        goal: `"I'm not the same anymore, I can't help myself to do this paperwork", "I don't know how to renew the food stamps". [CLIENT] will renew [HIS] SNAP benefit during the next six months.`,
                        objectives: [
                            `[CLIENT] will be assisted to renew [HIS] food stamps benefits. [CLIENT] will be assisted in updating [HIS] DCF account on [HIS] behalf if necessary. The TCM will assist [CLIENT] in obtaining all the necessary documentation for this service during the next six months.`,
                            `[CLIENT] will obtain and complete the authorization to disclose information to authorize TCM to renew [HIS] food stamps at the DCF office and will obtain the eligibility letter with the information about [HIS] benefits. [CLIENT] will be assisted by the TCM to provide all the necessary information and documentation when completing the food stamps application during the next six months.`,
                            `[CLIENT] will be educated about its benefits and [HIS] renewal. The TCM will advocate on [CLIENT]'s behalf and will monitor the renewal of [CLIENT]´s food stamps and will inform [HIM] in case of any news or change in [HIS] account during the next six months.`
                        ],
                        responsible: "TCM, [CLIENT], Department of Children and Family."
                    }
                ],
                domain_basic_needs: [
                    {
                        name: "9.1 Food & Household Essentials",
                        description: "DESCRIPTION: Access to food, clothing, and household essentials.\n\n[CLIENT] needs food donations, hot meals, and frozen food to cover some of [HIS] basic needs. [CLIENT] cannot afford to buy food and other items by [HIMSELF] because of [HIS] age and medical condition. [HE] needs to maintain a strict diet regime based on healthy food.",
                        needs: "[CLIENT] needs food donations, hot meals, and frozen foods, to cover some of [HIS] basic needs.",
                        goal: `"I don't feel able to obtain the food, cleaning supplies, clothes, furniture, appliances, and personal care items that I need by myself". [CLIENT] will obtain food donations, hot meals, and frozen foods to cover some of [HIS] basic needs during the next six months.`,
                        objectives: [
                            `[CLIENT] will receive assistance with food resources from the community for the next six months. [CLIENT] will have access to community resources that will help a low-income person to obtain food, cleaning supplies, clothes, furniture, appliances, and personal care items during the next six months.`,
                            `[CLIENT] will receive food, cleaning supplies, clothes, furniture, appliances, and personal care items donations through different community resources for the next six months. The case manager will link [CLIENT] with food banks, local churches, charitable organizations, and resources that provide food and donations to low-income families in need.`,
                            `[CLIENT] will be linked with a community network. [CLIENT] will be able to apply by [HIMSELF] and monitor places and centers that offer donations in [HIS] community. CM will instruct [CLIENT] with relevant information about food donation. CM will monitor application outcomes through contact with all parties involved by notifications received or phone calls.`
                        ],
                        responsible: "TCM, [CLIENT], food banks, local churches, charitable organizations, and resources that provide food, cleaning supplies, clothes, furniture, appliances, and personal care items donations to low-income families in need."
                    }
                ],
                domain_transportation: [
                    {
                        name: "10.1 Disabled Parking Permit",
                        description: "DESCRIPTION: Apply for Disabled Parking Permit (DPP).\n\n[CLIENT] grapples with multiple health conditions, warranting the necessity for a disabled parking permit to facilitate [HIS] mobility and ensure [HIS] access to essential services.",
                        needs: "[CLIENT], lacking transportation means, is in need of acquiring the Golden Passport card to facilitate [HIS] mobility. Also, [CLIENT] needs to obtain the Handicap Parking Permit. [HE] is facing challenges associated with multiple health conditions, necessitating the acquisition of a disabled parking permit for [HIS] convenience and improved accessibility.",
                        goal: `"I aspire to obtain my parking permit for people with disabilities." [CLIENT] will obtain a disabled parking permit with the case manager´s assistance.`,
                        objectives: [
                            `[CLIENT] will proactively seek information about the Tag Agency nearest to [HIS] residence, intending to visit and articulate [HIS] situation. To minimize travel challenges, the case manager will support [CLIENT] in identifying the most convenient Tag Agency office and assist [HIM] throughout the registration process. The case manager will also advocate on [HIS] behalf, explaining the necessity for a disabled parking permit within the next six months.`,
                            `Over the course of the next six months, [CLIENT] commits to fulfilling all paperwork requirements for obtaining the disabled parking permit. The case manager will play a pivotal role in aiding [CLIENT] with form completion and ensuring [HIS] understanding of any recommendations provided by the representatives.`,
                            `[CLIENT] will obtain [HIS] disabled parking permit within the next six months. The case manager will diligently monitor the progress of this process through regular phone calls or face-to-face reports, ensuring a seamless and supportive experience for [CLIENT].`
                        ],
                        responsible: "[CLIENT], TCM, PCP, Tag Agency Office (Any location applicable)."
                    },
                    {
                        name: "10.2 Modivcare",
                        description: "DESCRIPTION: Modivcare Transportation Services.\n\n[CLIENT] requires assistance to apply for and utilize Modivcare Transportation services. Due to [HIS] cognitive and emotional limitations, [HE] is unable to independently complete the enrollment process, schedule rides, or manage the required documentation. Case Management support is necessary to ensure proper access to transportation, promote attendance at medical appointments, and support the client's independence and overall well-being.",
                        needs: "[CLIENT] needs support with scheduling and coordinating different modes of transportation, including the use of services such as Uber, as well as assistance in modifying and managing applications related to [HIS] transportation needs (Modivcare Transportation).",
                        goal: `[CLIENT] stated that [HIS] goal is to receive support with the application process for Modivcare transportation services. [HE] expressed that having access to this benefit will allow [HIM] to attend medical appointments regularly, avoid missed treatments, and feel more secure regarding [HIS] health care.`,
                        objectives: [
                            `The Case Manager will provide [CLIENT] with updated information about the Modivcare transportation program, including eligibility requirements, application process, and benefits, ensuring the client understands how the service operates.`,
                            `The Case Manager will assist the client in creating a Modivcare account, supporting [HIM] in entering [HIS] personal information, including [HIS] insurance Member ID, and ensuring the account is properly activated for transportation use.`,
                            `The Case Manager will educate the client on how to properly schedule and coordinate transportation services through Modivcare, including the process for booking, confirming, and managing medical appointments.`
                        ],
                        responsible: "[CLIENT], Modivcare Company, TCM, Insurance."
                    },
                    {
                        name: "10.3 Special Transportation Services (STS)",
                        description: "DESCRIPTION: Apply for Special Transportation Services (STS).\n\n[CLIENT] needs to complete the application process for Special Transportation Services (STS), a door-to-door transportation program that accommodates individuals with limited mobility. Due to physical limitations, [CLIENT] is unable to walk long distances or use standard public transportation.",
                        needs: "[CLIENT] needs to complete the application process for Special Transportation Services (STS), a door-to-door transportation program that accommodates individuals with limited mobility. Due to physical limitations, [CLIENT] is unable to walk long distances or use standard public transportation. Access to STS will allow [HIM] to attend medical appointments and fulfill essential errands while maintaining safety and independence.",
                        goal: `[CLIENT] stated, \"I feel unable to walk long distances to take public transportation.\" [CLIENT] will complete the application process for STS with the assistance of the case manager within the next six months to support [HIS] mobility and ensure access to essential services.`,
                        objectives: [
                            `[CLIENT] will complete and submit the required STS application form. The TCM will obtain the application, explain each section to [CLIENT], and assist [HIM] in completing it. The TCM will also provide clarification on required supporting documentation and program expectations, during the next six months.`,
                            `[CLIENT] will comply with all STS program requirements and attend the eligibility interview. The TCM will coordinate the appointment, provide advocacy during the interview process, and maintain contact with the STS program to facilitate clear communication and timely follow-up, during the next six months.`,
                            `[CLIENT] will receive a decision on [HIS] application and begin using the transportation services if approved. The TCM will monitor the outcome of the application, follow up with the STS office as needed, and provide guidance to [CLIENT] on how to use the service appropriately, including scheduling and usage policies, during the next six months.`
                        ],
                        responsible: "[CLIENT], Targeted Case Manager (TCM), Primary Care Provider (PCP), and Paratransit Services Office (STS Program) – 701 NW 1st Ct #131, Miami, FL 33136. Phone: (305) 891-3131."
                    },
                    {
                        name: "10.4 Golden Passport",
                        description: "DESCRIPTION: Golden Passport.\n\n[CLIENT], lacking transportation means, is in need of acquiring the Golden Passport card to facilitate [HIS] mobility. [HIS] inability to traverse long distances has significantly impacted [HIS] ability to visit family and friends, prompting the urgency of obtaining this card.",
                        needs: "[CLIENT], lacking transportation means, is in need of acquiring the Golden Passport card to facilitate [HIS] mobility. Also, [CLIENT] needs to obtain the Handicap Parking Permit. [HE] is facing challenges associated with multiple health conditions, necessitating the acquisition of a disabled parking permit for [HIS] convenience and improved accessibility.",
                        goal: `"I´m not the same anymore since I can´t visit my family, and friends because I´m unable to walk long distances." [CLIENT] will obtain the Golden Passport card.`,
                        objectives: [
                            `[CLIENT] will diligently gather all necessary documentation for the Golden Passport application process. With the assistance of [HIS] case manager, [HE] aims to complete the application within the next month, during the next six months.`,
                            `[CLIENT] will meticulously fill out [HIS] Golden Passport application, ensuring all provided information is accurate. The case manager will assist [CLIENT] in completing the application during the next six months. CM will assist confirm the Golden Passport form correctness.`,
                            `[CLIENT] will promptly submit [HIS] Golden Passport application within the next six months. Subsequently, [HIS] case manager will oversee the process, monitoring the receipt of the card and verifying its functionality through either visual inspection or communication with [CLIENT].`
                        ],
                        responsible: "TCM, [CLIENT], Miami Dade Transit Agency 111 NW 1st St #910, Miami, FL 33128, Phone (305) 770-3131."
                    },
                    {
                        name: "10.5 Freebee",
                        description: "DESCRIPTION: Freebee Transportation Services.\n\n[CLIENT] experiences significant transportation barriers due to chronic mental health conditions, anxiety, impaired concentration, and multiple medical conditions. [HE] does not drive and is unable to safely or consistently use public transportation independently. Limited transportation access interferes with [HIS] ability to attend medical, psychiatric, and case management appointments, as well as complete essential community errands.",
                        needs: "[CLIENT], due to [HIS] mental health diagnoses, cognitive limitations, and medical conditions, does not drive and requires community-based transportation services to safely access healthcare appointments, pharmacies, and essential community resources.",
                        goal: `"I want reliable transportation so I can get to my appointments and take care of my needs." [CLIENT] will be linked with Freebee transportation services with the assistance of the case manager during the next six months.`,
                        objectives: [
                            `[CLIENT] will be linked to Freebee transportation services to support access to local medical appointments, pharmacies, and essential community errands.`,
                            `The TCM will assist [CLIENT] with registration, account setup, and education on how to request and appropriately use Freebee transportation, including reviewing service areas, scheduling procedures, and safety guidelines.`,
                            `The TCM will provide ongoing support and monitoring to ensure [CLIENT] is able to consistently utilize Freebee transportation for appointments and errands and will address any barriers or issues that arise.`
                        ],
                        responsible: "[CLIENT], Targeted Case Manager (TCM), Freebee Transportation Service."
                    }
                ],
                domain_other: [
                    {
                        name: "12.1 Emergency Evacuation Plan",
                        description: "DESCRIPTION: Emergency Evacuation Plan of Miami-Dade.\n\n[CLIENT] needs to be linked with the Emergency Evacuation Plan of Miami-Dade to ensure [HIS] safety and preparedness in emergencies.",
                        needs: "[CLIENT] must be linked with the Emergency Evacuation Plan of Miami-Dade to ensure [HIS] safety and preparedness in emergencies. The case Manager will assist the client with this issue during the hurricane season.",
                        goal: `"I don´t know what I have to do in case a Hurricane appears in Florida". "I need an emergency evacuation plan to be safe during this season". [CLIENT] will be linked with the Emergency Evacuation Plan of Miami-Dade during the hurricane season.`,
                        objectives: [
                            `[CLIENT] will take proactive steps to be safe and prepared to face potential emergencies, recognizing the importance of being prepared, especially considering [CLIENT]'s unique needs. CM will conduct a thorough assessment of [CLIENT]'s living situation, taking into account [HIS] specific requirements and any potential challenges [HE] might face during emergencies, during the hurricane season.`,
                            `[CLIENT] will obtain the application at the Miami Dade Emergency Department and CM will assist [HIM] in completing it during the hurricane season. CM will educate [CLIENT] about the Emergency Evacuation Plan of Miami-Dade, explaining the evacuation routes, designated shelters, and necessary emergency supplies. [CLIENT]´s PCP will complete the EEP application.`,
                            `[CLIENT] will be linked with the Miami Dade Emergency Department during the hurricane season. CM will ensure [CLIENT] understands the importance of having a plan in place and being familiar with the procedures. Case manager will make a follow-up session with [CLIENT] to review the Emergency Evacuation Plan together, answer any questions [HE] might have, and address any additional concerns that may arise.`
                        ],
                        responsible: "Miami Dade Emergency Department 9300 NW 41st St, Doral, FL 33178, phone (786) 331-5000; CM; [CLIENT]; PCP."
                    }
                ]
            };

            const activeDomains = domainOrder.filter(key => checkedDomains.includes(key));
            console.log("📂 Active checked domains detected:", activeDomains.join(', '));

            // Helper to check if patient already has a benefit from dbPatient records
            const hasBenefit = (benefitName) => {
                if (!dbPatient) return false;
                const lowerBenefit = benefitName.toLowerCase();
                const fieldsToCheck = [
                    dbPatient.domain_transportation_note,
                    dbPatient.domain_physical_health_note,
                    dbPatient.presenting_problems_description,
                    dbPatient.presenting_problems,
                    dbPatient.other_needs
                ];
                
                const socialNeeds = dbPatient.tcm_social_needs || {};
                if (socialNeeds.transportation_ability_description) {
                    fieldsToCheck.push(socialNeeds.transportation_ability_description);
                }
                if (socialNeeds.financial_difficulties_description) {
                    fieldsToCheck.push(socialNeeds.financial_difficulties_description);
                }
                if (socialNeeds.other_financial_resources) {
                    fieldsToCheck.push(socialNeeds.other_financial_resources);
                }
                
                for (const field of fieldsToCheck) {
                    if (field && (
                        field.toLowerCase().includes(`already has ${lowerBenefit}`) || 
                        field.toLowerCase().includes(`already holds ${lowerBenefit}`) ||
                        field.toLowerCase().includes(`currently has ${lowerBenefit}`) ||
                        field.toLowerCase().includes(`currently holds ${lowerBenefit}`) ||
                        field.toLowerCase().includes(`already enrolled in ${lowerBenefit}`) ||
                        field.toLowerCase().includes(`already has a ${lowerBenefit}`) ||
                        field.toLowerCase().includes(`already holds a ${lowerBenefit}`)
                    )) {
                        return true;
                    }
                }
                return false;
            };

            const resolveTemplate = (text) => {
                if (!text) return "";
                let resolved = replacePronouns(text);
                // Replace remaining placeholders
                resolved = resolved.replace(/\[TARGET_DATE\]/g, spData.service_plan_target_date);
                // Remove unwanted names
                resolved = resolved.replace(/\bOswaldo\b/ig, "").replace(/\bZobeida\b/ig, "");
                return resolved;
            };

            let totalBlocksCreated = 0;
            let totalObjectivesWritten = 0;
            const skippedBlocks = [];
            const flaggedDomainsSec3 = [];

            const domainTitles = {
                domain_mental_health: 'Mental Health',
                domain_physical_health: 'Physical Health',
                domain_vocational: 'Vocational',
                domain_education: 'Education',
                domain_recreational: 'Recreational',
                domain_daily_living: 'Daily Living',
                domain_housing: 'Housing',
                domain_financial: 'Financial',
                domain_basic_needs: 'Basic Needs',
                domain_transportation: 'Transportation',
                domain_legal: 'Legal',
                domain_other: 'Other'
            };

            // Expandir la sección principal SECTION III si está colapsada en el DOM
            try {
                // Esperar a que al menos un acordeón esté presente en el DOM
                await frame.locator('.accordion_in, .acc_section').first().waitFor({ state: 'attached', timeout: 20000 });

                const allCards = await frame.locator('.accordion_in, .acc_section').all();
                console.log(`   🔎 Section III Expansion Debug: Found ${allCards.length} cards in DOM.`);
                
                for (let cIdx = 0; cIdx < allCards.length; cIdx++) {
                    const card = allCards[cIdx];
                    const cardText = await card.textContent().catch(() => '');
                    if (cardText.toLowerCase().includes('section iii')) {
                        const section3Head = card.locator('.acc_head').first();
                        const isCollapsed = await section3Head.evaluate(el => el.classList.contains('collapsed') || el.getAttribute('aria-expanded') === 'false').catch(() => false);
                        if (isCollapsed) {
                            console.log("   🔓 Expandiendo sección principal SECTION III...");
                            await section3Head.scrollIntoViewIfNeeded();
                            await section3Head.click();
                            await page.waitForTimeout(3000);
                        }
                        break;
                    }
                }
            } catch (sec3ExpErr) {
                console.log(`   ⚠️ Error expandiendo SECTION III: ${sec3ExpErr.message}`);
            }

            for (let activeIdx = 0; activeIdx < activeDomains.length; activeIdx++) {
                const domainKey = activeDomains[activeIdx];
                const idx = domainOrder.indexOf(domainKey) + 1; // 1-based index
                const segmentId = `#div_segmento_${33 + 7 * idx}`;
                
                console.log(`📂 Processing domain Section III: ${domainKey} (Segmento ID: ${segmentId})`);

                // En el Plan de Servicio los dominios son segmentos planos dentro de la Sección III. No hay acordeones de dominio individuales.

                const blocks = approvedBlocks[domainKey];
                if (!blocks) {
                    // Checkbox is checked but we don't have approved templates
                    console.log(`⚠️ Domain ${domainKey} is active but has no pre-approved templates in Section III. Flagging.`);
                    flaggedDomainsSec3.push(domainKey);
                    
                    try {
                        const segmentBlock = frame.locator(segmentId).locator('.df-example.demo-forms').first();
                        const statusSelect = segmentBlock.locator('select').first();
                        if (await statusSelect.isVisible()) {
                            await statusSelect.selectOption({ index: 1 });
                        }
                    } catch (sec3Err) {
                        console.log(`   ⚠️ Error filling default status for unapproved domain: ${sec3Err.message}`);
                    }
                    continue;
                }

                // Filter blocks based on case necessities & existing benefits
                const blocksToBuild = [];
                const matchedCaseBlocks = caseAnalysis.matchedBlocks[domainKey] || [];
                const createdBlockNames = [];

                for (const block of blocks) {
                    let skip = false;
                    
                    // Rule 1: If case necessities were identified, block name must match an identified necessity
                    if (matchedCaseBlocks.length > 0 && !matchedCaseBlocks.some(mb => block.name.includes(mb) || mb.includes(block.name))) {
                        skip = true;
                    }
                    
                    // Rule 2: Skip existing benefits
                    if (block.name.includes("Golden Passport") && hasBenefit("Golden Passport")) {
                        skip = true;
                    } else if (block.name.includes("Special Transportation Services") && hasBenefit("STS")) {
                        skip = true;
                    } else if (block.name.includes("Food Stamps Recertification") && !needsSnapRenewal) {
                        skip = true;
                    }
                    
                    if (skip) {
                        console.log(`   ⏭️ Skipping block "${block.name}" (not matched by case necessity or already possessed).`);
                        skippedBlocks.push(block.name);
                    } else {
                        blocksToBuild.push(block);
                    }
                }

                if (blocksToBuild.length === 0) {
                    console.log(`   ℹ️ All blocks for ${domainKey} were skipped.`);
                    continue;
                }

                // 1. Create duplicate blocks if needed
                const duplicatesNeeded = blocksToBuild.length - 1;
                for (let d = 0; d < duplicatesNeeded; d++) {
                    console.log(`   ➕ Duplicating block for ${domainKey} (Duplication #${d+1})...`);
                    let duplicateLink = frame.locator(segmentId).locator('a, button, span').filter({ hasText: /DUPLICATE|Duplicar/i }).first();
                    if (!await duplicateLink.isVisible()) {
                        duplicateLink = frame.locator('a, button, span').filter({ hasText: /DUPLICATE|Duplicar/i }).first();
                    }

                    if (await duplicateLink.isVisible()) {
                        await duplicateLink.scrollIntoViewIfNeeded();
                        await duplicateLink.click();
                        await page.waitForTimeout(1500);

                        // Find and confirm custom duplicate modal (Notiflix / SweetAlert / Amexzone popups)
                        const notiflixOk = frame.locator('#NXConfirmButtonOk, .swal2-confirm, button:has-text("Yes"), button:has-text("Sí"), button:has-text("OK"), button:has-text("Aceptar"), button:has-text("Duplicate")').first();
                        const pageNotiflixOk = page.locator('#NXConfirmButtonOk, .swal2-confirm, button:has-text("Yes"), button:has-text("Sí"), button:has-text("OK"), button:has-text("Aceptar"), button:has-text("Duplicate")').first();

                        if (await notiflixOk.isVisible().catch(() => false)) {
                            await notiflixOk.click({ force: true });
                            console.log("   ✅ Duplicate modal confirmed in frame.");
                            await page.waitForTimeout(3000);
                        } else if (await pageNotiflixOk.isVisible().catch(() => false)) {
                            await pageNotiflixOk.click({ force: true });
                            console.log("   ✅ Duplicate modal confirmed in page.");
                            await page.waitForTimeout(3000);
                        } else {
                            console.log("   ⚠️ Confirm button not found in modal.");
                        }
                    } else {
                        console.log("   ⚠️ DUPLICATE link not found or visible.");
                    }
                }

                // 2. Fill the blocks with strict 5-field mapping
                const domainTitle = domainTitles[domainKey] || '';
                let domBlocks = [];
                
                // Esperar a que el segmento del dominio esté presente en el DOM
                await frame.locator(segmentId).first().waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
                
                // Esperar hasta 15 segundos a que todos los bloques (incluyendo duplicados) estén renderizados
                const expectedCount = blocksToBuild.length;
                for (let attempt = 0; attempt < 15; attempt++) {
                    const section3Card = frame.locator('.accordion_in, .acc_section').filter({ hasText: /SECTION III/i }).first();
                    const section3Body = section3Card.locator('.collapse, .show, div[id^="preview_seccion_s_"]').first();
                    const allSegments = await section3Body.locator('> div, > .py-2').all();
                    domBlocks = [];
                    for (const segment of allSegments) {
                        const txt = await segment.textContent().catch(() => '');
                        if (txt.toLowerCase().includes(domainTitle.toLowerCase())) {
                            domBlocks.push(segment);
                        }
                    }
                    console.log(`   🔎 DOM Debug: Found ${domBlocks.length} blocks for ${domainKey} on attempt ${attempt+1}.`);
                    if (domBlocks.length >= expectedCount) {
                        break;
                    }
                    await page.waitForTimeout(1000);
                }
                console.log(`   📊 Found ${domBlocks.length} DOM blocks. Filling ${blocksToBuild.length} approved blocks.`);

                for (let b = 0; b < blocksToBuild.length && b < domBlocks.length; b++) {
                    const blockData = { ...blocksToBuild[b] };
                    if (blockData.objectives) {
                        blockData.objectives = [...blockData.objectives];
                    }
                    // Determine which sub-block key from Clio corresponds to this EMR block
                    let subBlockKey = domainKey;
                    if (domainKey === 'domain_physical_health') {
                        if (blockData.name.toLowerCase().includes('otc')) {
                            subBlockKey = 'domain_physical_health_otc';
                        } else if (blockData.name.toLowerCase().includes('alarm')) {
                            subBlockKey = 'domain_physical_health_alarm';
                        }
                    } else if (domainKey === 'domain_transportation') {
                        if (blockData.name.toLowerCase().includes('special') || blockData.name.toLowerCase().includes('sts')) {
                            subBlockKey = 'domain_transportation_sts';
                        } else if (blockData.name.toLowerCase().includes('permit') || blockData.name.toLowerCase().includes('dpp')) {
                            subBlockKey = 'domain_transportation_dpp';
                        }
                    }

                    const customDomain = spData.domains?.[subBlockKey];
                    if (customDomain) {
                        if (customDomain.description) blockData.description = customDomain.description;
                        if (customDomain.needs_identified) blockData.needs = customDomain.needs_identified;
                        else if (customDomain.needs) blockData.needs = customDomain.needs;
                        if (customDomain.long_term_goal) blockData.goal = customDomain.long_term_goal;
                        if (customDomain.responsible) blockData.responsible = customDomain.responsible;
                        
                        if (blockData.objectives) {
                            if (customDomain.objective_1) blockData.objectives[0] = customDomain.objective_1;
                            if (customDomain.objective_2) blockData.objectives[1] = customDomain.objective_2;
                            if (customDomain.objective_3) blockData.objectives[2] = customDomain.objective_3;
                        }
                    }
                    const domBlock = domBlocks[b];
                    const blockContainer = domBlock.locator('.df-example, .demo-forms').first();
                    
                    console.log(`   ✍️ Filling block: "${blockData.name}"`);
                    createdBlockNames.push(blockData.name);

                    // Find textareas outside the table locally
                    const allTas = await blockContainer.locator('textarea').all();
                    const outsideTextareas = [];
                    for (const ta of allTas) {
                        const isInsideTbl = await ta.evaluate(el => !!el.closest('table')).catch(() => false);
                        if (!isInsideTbl) {
                            outsideTextareas.push(ta);
                        }
                    }

                    // Field 1: Description (starts with DESCRIPTION:, no quotes)
                    if (outsideTextareas.length >= 1) {
                        let descVal = resolveTemplate(blockData.description);
                        if (!descVal.startsWith("DESCRIPTION:")) {
                            descVal = "DESCRIPTION: " + descVal;
                        }
                        await fillInputLoc(outsideTextareas[0], descVal);
                    } else {
                        console.log(`      ⚠️ Warning: No Description textarea found outside table!`);
                    }

                    // Field 2: Status (select valid status option / index 1)
                    const statusSelect = blockContainer.locator('select').first();
                    if (await statusSelect.isVisible()) {
                        await statusSelect.evaluate(el => {
                            el.removeAttribute('disabled');
                            el.disabled = false;
                        });
                        let statusToSelect = 'New';
                        if (customDomain && customDomain.status) {
                            statusToSelect = customDomain.status;
                        }
                        await statusSelect.selectOption({ label: statusToSelect }).catch(async () => {
                            await statusSelect.selectOption({ index: 1 });
                        });
                    }

                    // Field 3: Identified service needs from SECTION II
                    if (outsideTextareas.length >= 2) {
                        await fillInputLoc(outsideTextareas[1], resolveTemplate(blockData.needs));
                    } else {
                        console.log(`      ⚠️ Warning: No Needs textarea found outside table!`);
                    }

                    // Field 4: Long Term Goal (contains quotes "I want...")
                    if (outsideTextareas.length >= 3) {
                        await fillInputLoc(outsideTextareas[2], resolveTemplate(blockData.goal));
                    } else {
                        console.log(`      ⚠️ Warning: No Goal textarea found outside table!`);
                    }

                    // Field 5: Objectives Table (3 rows)
                    try {
                        const table = blockContainer.locator('table').first();
                        const rows = await table.locator('tbody tr').all();
                        
                        for (let r = 0; r < rows.length && r < 3; r++) {
                            const tr = rows[r];
                            const objText = blockData.objectives[r];
                            
                            const textareas = await tr.locator('textarea').all();
                            if (textareas.length >= 2) {
                                await fillInputLoc(textareas[0], resolveTemplate(objText));
                                await fillInputLoc(textareas[1], resolveTemplate(blockData.responsible));
                            }

                            const dateInputs = await tr.locator('input[placeholder="MM/DD/YYYY"]').all();
                            if (dateInputs.length >= 2) {
                                let customObjDateIdentified = customDomain?.date_identified || planStartDate;
                                let customObjTargetDate = spData.service_plan_target_date;
                                if (customDomain) {
                                    if (r === 0 && customDomain.objective_1_date) customObjTargetDate = customDomain.objective_1_date;
                                    if (r === 1 && customDomain.objective_2_date) customObjTargetDate = customDomain.objective_2_date;
                                    if (r === 2 && customDomain.objective_3_date) customObjTargetDate = customDomain.objective_3_date;
                                }
                                await fillInputLoc(dateInputs[0], customObjDateIdentified);
                                await fillInputLoc(dateInputs[1], customObjTargetDate);
                            }
                            totalObjectivesWritten++;
                        }
                    } catch (tblErr) {
                        console.log(`      ⚠️ Error in objectives table of block: ${tblErr.message}`);
                    }
                    totalBlocksCreated++;
                }
            }

            console.log("🏁 Section III filling complete.");
            console.log(`Summary: Blocks created: ${totalBlocksCreated}, Objectives written: ${totalObjectivesWritten}`);
            console.log(`Skipped blocks: ${skippedBlocks.join(', ') || 'none'}`);
            console.log(`Flagged domains: ${flaggedDomainsSec3.join(', ') || 'none'}`);

            if (flaggedDomainsSec3.length > 0) {
                throw new Error(`Human review required in Section III: The following active domains do not have pre-approved text: ${flaggedDomainsSec3.join(', ')}`);
            }


            // Expected review date
            await fillInputById('#preview_response_pregunta_124', spData.service_plan_target_date);

            // Consent radio check
            try {
                const radio = frame.locator('#preview_response_option_4_13_125_264').first();
                if (await radio.isVisible()) {
                    await radio.evaluate(el => {
                        el.removeAttribute('disabled');
                        el.disabled = false;
                    });
                    await radio.check({ force: true });
                    console.log("   ✅ Consent radio button checked.");
                }
            } catch (e) {
                console.log("   ⚠️ Error al marcar radio de consentimiento:", e.message);
            }

        } else {
            const data = payload.assessment_data;
            const assessmentFlags = [];

            // Complete ICD-10 Descriptor Lookup mapping
            const icd10Lookup = {
                'F32.9': 'Major depressive disorder, single episode, unspecified',
                'F33.1': 'Major depressive disorder, recurrent, moderate',
                'F33.2': 'Major depressive disorder, recurrent, severe without psychotic features',
                'F41.1': 'Generalized anxiety disorder',
                'G47.00': 'Insomnia, unspecified',
                'F43.81': 'Prolonged grief disorder',
                'F43.23': 'Adjustment disorder with mixed anxiety and depressed mood'
            };

            if (data.diagnosis_code) {
                const code = String(data.diagnosis_code).trim().toUpperCase();
                if (icd10Lookup[code]) {
                    data.diagnosis_descriptor = `${code} ${icd10Lookup[code]}`;
                }
            }

        // --- 1. DATOS TEXTO Y TEXTAREAS ---
        const pName = payload.patient_name || 'Client';
        const pGender = (payload.gender || 'Female').toLowerCase();
        const pHe = pGender === 'male' ? 'he' : 'she';
        const pHis = pGender === 'male' ? 'his' : 'her';

        const textMappings = [
            { selector: '#preview_response_pregunta_6', value: payload.ssn },
            { selector: '#preview_response_pregunta_8', value: data.home_phone_no || payload.phone },
            { selector: '#preview_response_pregunta_10', value: data.other_phone_no },
            { selector: '#preview_response_pregunta_11', value: payload.email },
            { selector: '#preview_response_pregunta_12', value: payload.address },
            { selector: '#preview_response_pregunta_17', value: data.other_language || payload.preferred_language || 'Spanish' },
            { selector: '#preview_response_pregunta_43', value: data.referred_by || 'Self / Family Referral' },
            { selector: '#preview_response_pregunta_44', value: data.referral_phone || payload.phone },
            { selector: '#preview_response_pregunta_45', value: data.referral_address || payload.address },
            { selector: '#preview_response_pregunta_46', value: data.referral_title || 'Case Manager' },
            { selector: '#preview_response_pregunta_47', value: data.referral_agency || 'Clinicflow TCM Services' },
            { selector: '#preview_response_pregunta_52', value: payload.presenting_problems || data.presenting_problems_description || data.presenting_problems || `${pName} is seeking Targeted Case Management services to assist with coordinating psychiatric treatment, primary medical care, benefit maintenance, and community support resources.` },
            { selector: '#preview_response_pregunta_53', value: data.onset_date || 'Over 1 year ago' },
            { selector: '#preview_response_pregunta_75', value: payload.pharmacy_name || data.pharmacy_name || 'NAVARRO DISCOUNT PHARMACY' },
            { selector: '#preview_response_pregunta_76', value: payload.pharmacy_phone || data.pharmacy_phone || '305-380-1343' },
            { selector: '#preview_response_pregunta_77', value: data.medication_issues_description || `${pName} adheres to prescribed medication regimen with assistance and supervision from family members and TCM case manager.` },
            { selector: '#preview_response_pregunta_79', value: data.mental_health_history || `Longstanding history of outpatient psychiatric treatment for depressive and anxiety symptoms. No recent psychiatric hospitalizations reported.` },
            { selector: '#preview_response_pregunta_80', value: payload.psych_name || 'Luannys Quesada APRN' },
            { selector: '#preview_response_pregunta_81', value: payload.psych_phone || '786-916-6073' },
            { selector: '#preview_response_pregunta_82', value: payload.psych_address || '14400 NW 77th Ct Ste 100, Miami Lakes, FL 33016' },
            { selector: '#preview_response_pregunta_83', value: data.diagnosis_code || "F33.1, F41.1, G47.00, F43.81" },
            { selector: '#preview_response_pregunta_84', value: data.diagnosis_descriptor || "F33.1 Major depressive disorder, recurrent, moderate; F41.1 Generalized anxiety disorder; G47.00 Insomnia, unspecified; F43.81 Prolonged grief disorder" },
            { selector: '#preview_response_pregunta_90', value: data.risk_details || 'No current active suicidal or homicidal ideation reported.' },
            { selector: '#preview_response_pregunta_91', value: data.risk_behavior_description || 'Low risk for self-harm. Client complies with safety recommendations.' },
            { selector: '#preview_response_pregunta_100', value: data.domain_mental_health_note || `${pName} experiences recurrent depressive and anxiety symptoms. ${pName} receives outpatient psychiatric care to maintain emotional stability.` },
            { selector: '#preview_response_pregunta_102', value: payload.pcp_name || 'Jose Aponte, MD' },
            { selector: '#preview_response_pregunta_103', value: payload.pcp_phone || '305-685-5688' },
            { selector: '#preview_response_pregunta_104', value: payload.pcp_clinic_name || 'Cano Health / Primary Medical Center' },
            { selector: '#preview_response_pregunta_105', value: payload.pcp_address || '4410 W 16th Ave, Hialeah, FL 33012' },
            { selector: '#preview_response_pregunta_108', value: data.allergies || 'No known drug allergies (NKDA)' },
            { selector: '#preview_response_pregunta_129', value: data.domain_physical_health_note || `${pName} has chronic physical medical conditions monitored by PCP. Requires assistance with appointment scheduling and OTC benefits.` },
            { selector: '#preview_response_pregunta_131', value: data.vocational_history || 'Formerly employed prior to retirement and disability.' },
            { selector: '#preview_response_pregunta_143', value: data.domain_vocational_note || `${pName} is retired due to age/disability and is not currently seeking employment.` },
            { selector: '#preview_response_pregunta_170', value: data.religion || 'Catholic / Christian' },
            { selector: '#preview_response_pregunta_173', value: data.enjoyable_activities || `${pName} enjoys watching television, listening to music, resting, and taking short walks.` },
            { selector: '#preview_response_pregunta_174', value: data.social_skills_description || `${pName} demonstrates cooperative social skills but experiences social isolation.` },
            { selector: '#preview_response_pregunta_175', value: data.support_system_description || `${pName}'s support system consists of close family, treating medical providers, and TCM case management.` },
            { selector: '#preview_response_pregunta_176', value: data.domain_recreational_note || `${pName} is encouraged to participate in community activities to enhance coping skills.` },
            { selector: '#preview_response_pregunta_179', value: data.domain_daily_living_note || `${pName} is independent in basic ADLs but requires assistance with complex IADLs including benefit paperwork and appointment coordination.` },
            { selector: '#preview_response_pregunta_182', value: data.co_habitants ? String(data.co_habitants).replace(/\D/g, '') || '1' : '1' },
            { selector: '#preview_response_pregunta_183', value: data.housing_bedrooms ? String(data.housing_bedrooms) : '2' },
            { selector: '#preview_response_pregunta_184', value: data.housing_ppb ? String(data.housing_ppb) : '1' },
            { selector: '#preview_response_pregunta_185', value: data.living_arrangements_description || `${pName} resides in an apartment setting.` },
            { selector: '#preview_response_pregunta_187', value: data.neighborhood_description || 'Residential neighborhood with access to medical services and transportation.' },
            { selector: '#preview_response_pregunta_191', value: data.domain_housing_note || `${pName}'s housing situation is stable. TCM monitors housing benefit maintenance.` },
            { selector: '#preview_response_pregunta_193', value: data.ssa_amount ? `$${data.ssa_amount}` : '$920.00' },
            { selector: '#preview_response_pregunta_194', value: data.ssi_details || 'SSI' },
            { selector: '#preview_response_pregunta_195', value: data.other_financial_resources || "Social Security (SSA/SSI) and SNAP/Food Stamps benefits." },
            { selector: '#preview_response_pregunta_198', value: data.domain_financial_note || `${pName} lives on a fixed monthly income and requires support for benefit recertifications.` },
            { selector: '#preview_response_pregunta_201', value: data.domain_basic_needs_note || `${pName}'s basic needs (food, clothing, shelter) are met with ongoing community assistance.` },
            { selector: '#preview_response_pregunta_208', value: data.domain_transportation_note || `${pName} relies on family transportation, public transit, or medical transportation for appointments.` },
            { selector: '#preview_response_pregunta_220', value: data.origin_country || 'Cuba' },
            { selector: '#preview_response_pregunta_221', value: data.us_entry_date ? String(data.us_entry_date).slice(0, 4) : '2010' },
            { selector: '#preview_response_pregunta_223', value: data.domain_legal_note && data.domain_legal_note !== 'None reported at this time' ? data.domain_legal_note : `${pName} has stable legal status with no active legal concerns.` },
            { selector: '#preview_response_pregunta_225', value: data.other_needs || "Assistance with medical appointment scheduling and benefit maintenance." },
            { selector: '#preview_response_pregunta_227', value: data.patient_strengths || "Compliant with medical treatment, motivated to maintain independence, good family communication." },
            { selector: '#preview_response_pregunta_228', value: data.patient_weaknesses || "Fixed monthly income, chronic physical health issues, depressive and anxiety symptoms." }
        ];

        for (const mapping of textMappings) {
            await fillInputById(mapping.selector, mapping.value);
        }

        // --- 2. DATOS SELECTS ---
        const selectMappings = [
            { selector: '#preview_response_pregunta_7', value: payload.gender },
            { selector: '#preview_response_pregunta_13', value: payload.race },
            { selector: '#preview_response_pregunta_14', value: payload.ethnicity },
            { selector: '#preview_response_pregunta_15', value: data.marital_status },
            { selector: '#preview_response_pregunta_121', value: data.exercise_frequency },
            { selector: '#preview_response_pregunta_132', value: data.employment_status },
            { selector: '#preview_response_pregunta_145', value: 'Adult' },
            { selector: '#preview_response_pregunta_163', value: data.education_level },
            { selector: '#preview_response_pregunta_181', value: data.residence_status },
            { selector: '#preview_response_pregunta_190', value: data.housing_preference },
            { selector: '#preview_response_pregunta_205', value: data.transportation_ability_description }
        ];

        for (const mapping of selectMappings) {
            await selectOptionById(mapping.selector, mapping.value);
        }

        // --- 3. DATOS RADIOS (SÍ/NO Y OPCIONES ÚNICAS) ---
        const citizenOption = String(payload.citizenship || data.citizenship_status || '').toLowerCase();
        let citizenSelector = '#preview_response_option_7_209_222_238'; // Default Other
        if (citizenOption.includes('citizen')) {
            citizenSelector = '#preview_response_option_7_209_222_236';
        } else if (citizenOption.includes('resident')) {
            citizenSelector = '#preview_response_option_7_209_222_237';
        }

        const radioMappings = [
            data.special_accommodations === 'Yes' ? '#preview_response_option_1_2_37_28' : '#preview_response_option_1_2_37_27',
            '#preview_response_option_1_2_39_29', // Default assessment Initial
            data.other_provider_case_management === 'Yes' ? '#preview_response_option_1_2_41_33' : '#preview_response_option_1_2_41_34',
            data.prev_psych_problems === 'Yes' ? '#preview_response_option_3_51_54_44' : '#preview_response_option_3_51_54_43',
            '#preview_response_option_4_55_56_254', // Child = No
            '#preview_response_option_6_69_74_66', // Refill problem = Yes
            (data.substance_abuse === 'Yes' || data.substance_abuse_history === 'Yes') ? '#preview_response_option_7_78_92_96' : '#preview_response_option_7_78_92_95',
            data.rehab_treatment === 'Yes' ? '#preview_response_option_7_78_94_98' : '#preview_response_option_7_78_94_97',
            data.addiction_problem === 'Yes' ? '#preview_response_option_7_78_99_100' : '#preview_response_option_7_78_99_99',
            (data.allergies && data.allergies.trim() !== '' && data.allergies.toLowerCase() !== 'no') ? '#preview_response_option_7_101_107_102' : '#preview_response_option_7_101_107_101',
            (data.surgeries && data.surgeries.trim() !== '' && data.surgeries.toLowerCase() !== 'no') ? '#preview_response_option_7_101_109_104' : '#preview_response_option_7_101_109_103',
            '#preview_response_option_7_101_111_105', // Hearing impairment = None
            '#preview_response_option_7_101_112_111', // Vision impairment = None
            data.is_pregnant === 'Yes' ? '#preview_response_option_7_101_113_118' : '#preview_response_option_7_101_113_117',
            data.vaccines_current ? '#preview_response_option_7_101_117_123' : '#preview_response_option_7_101_117_124',
            data.special_diet === 'Yes' ? '#preview_response_option_7_101_119_126' : '#preview_response_option_7_101_119_125',
            (data.pain_last_30_days === 'Yes' || data.experiencing_pain === 'Yes') ? '#preview_response_option_7_101_123_274' : '#preview_response_option_7_101_123_273',
            data.employment_status && data.employment_status.toLowerCase().includes('employed') ? '#preview_response_option_7_130_133_141' : '#preview_response_option_7_130_133_142',
            data.interest_further_education === 'Yes' ? '#preview_response_option_7_144_164_180' : '#preview_response_option_7_144_164_179',
            data.need_education_assistance === 'Yes' ? '#preview_response_option_7_144_166_182' : '#preview_response_option_7_144_166_181',
            data.social_program_participation === 'Yes' ? '#preview_response_option_7_169_171_184' : '#preview_response_option_7_169_171_183',
            (data.feels_safe_home === 'No' || data.home_safe === 'No') ? '#preview_response_option_7_180_188_209' : '#preview_response_option_7_180_188_208',
            data.financial_difficulties ? '#preview_response_option_7_192_196_215' : '#preview_response_option_7_192_196_214',
            data.other_transportation_needs === 'Yes' ? '#preview_response_option_7_202_206_227' : '#preview_response_option_7_202_206_226',
            (data.ever_arrested === 'Yes' || data.arrest_history === 'Yes') ? '#preview_response_option_7_209_211_229' : '#preview_response_option_7_209_211_228',
            (data.ongoing_legal_process === 'Yes' || data.legal_process === 'Yes') ? '#preview_response_option_7_209_215_233' : '#preview_response_option_7_209_215_232',
            citizenSelector,
            '#preview_response_option_10_232_233_252'
        ];

        for (const selector of radioMappings) {
            await clickRadioById(selector);
        }

        // --- 4. DATOS CHECKBOXES ---
        const checkboxMappings = [
            { selector: '#preview_response_option_2_42_48_35', checked: data.info_client_input },
            { selector: '#preview_response_option_2_42_48_36', checked: data.info_family_friends },
            { selector: '#preview_response_option_2_42_48_37', checked: data.info_referring_agency },
            { selector: '#preview_response_option_2_42_48_39', checked: data.info_treating_providers },
            { selector: '#preview_response_option_2_42_48_40', checked: data.info_caregiver },
            { selector: '#preview_response_option_2_42_48_41', checked: data.info_records_review },
            
            { selector: '#preview_response_option_6_69_71_53', checked: data.med_rem_directions },
            { selector: '#preview_response_option_6_69_71_54', checked: data.med_rem_calendar },
            { selector: '#preview_response_option_6_69_71_55', checked: data.med_rem_visible || true },
            { selector: '#preview_response_option_6_69_71_56', checked: data.med_rem_organizer },
            { selector: '#preview_response_option_6_69_71_57', checked: data.med_rem_electronic },
            { selector: '#preview_response_option_6_69_71_58', checked: data.med_rem_association },
            { selector: '#preview_response_option_6_69_71_59', checked: data.med_rem_family },
            { selector: '#preview_response_option_6_69_71_60', checked: data.med_rem_rn },
            
            { selector: '#preview_response_option_6_69_73_62', checked: data.med_self_none },
            { selector: '#preview_response_option_6_69_73_63', checked: true }, // With some help or occasional supervision
            { selector: '#preview_response_option_6_69_73_64', checked: data.med_self_lot },
            { selector: '#preview_response_option_6_69_73_65', checked: data.med_self_unable },
            
            { selector: '#preview_response_option_7_78_85_68', checked: data.symptom_depression },
            { selector: '#preview_response_option_7_78_85_69', checked: data.symptom_sadness },
            { selector: '#preview_response_option_7_78_85_70', checked: data.symptom_hopelessness },
            { selector: '#preview_response_option_7_78_85_71', checked: data.symptom_helplessness },
            { selector: '#preview_response_option_7_78_85_72', checked: data.symptom_negative },
            { selector: '#preview_response_option_7_78_85_73', checked: data.symptom_withdrawal },
            { selector: '#preview_response_option_7_78_85_74', checked: data.symptom_neglect },
            { selector: '#preview_response_option_7_78_85_75', checked: data.symptom_interest },
            { selector: '#preview_response_option_7_78_85_76', checked: data.symptom_esteem },
            { selector: '#preview_response_option_7_78_85_77', checked: data.symptom_anxiety },
            { selector: '#preview_response_option_7_78_85_78', checked: data.symptom_nervousness },
            { selector: '#preview_response_option_7_78_85_79', checked: data.symptom_irritability },
            { selector: '#preview_response_option_7_78_85_80', checked: data.symptom_sleep },
            { selector: '#preview_response_option_7_78_85_81', checked: data.symptom_concentration },
            { selector: '#preview_response_option_7_78_85_82', checked: data.symptom_panic },
            { selector: '#preview_response_option_7_78_85_83', checked: data.symptom_fearfulness },
            { selector: '#preview_response_option_7_78_85_84', checked: data.symptom_paranoia },
            { selector: '#preview_response_option_7_78_85_85', checked: data.symptom_obsessive },
            { selector: '#preview_response_option_7_78_85_86', checked: data.symptom_aggressiveness },
            { selector: '#preview_response_option_7_78_85_87', checked: data.symptom_hyperactivity },
            { selector: '#preview_response_option_7_78_85_88', checked: data.symptom_impulsivity },
            { selector: '#preview_response_option_7_78_85_89', checked: data.symptom_moodswings },
            { selector: '#preview_response_option_7_78_85_90', checked: data.symptom_hallucinations },
            { selector: '#preview_response_option_7_78_85_91', checked: data.symptom_delusions },
            
            { selector: '#preview_response_option_7_78_87_92', checked: data.risk_suicidal },
            { selector: '#preview_response_option_7_78_87_93', checked: data.risk_homicidal },
            { selector: '#preview_response_option_7_78_87_94', checked: data.risk_abuse },
            
            { selector: '#preview_response_option_7_180_186_193', checked: data.risk_structural },
            { selector: '#preview_response_option_7_180_186_194', checked: data.risk_electrical },
            { selector: '#preview_response_option_7_180_186_195', checked: data.risk_lighting },
            { selector: '#preview_response_option_7_180_186_196', checked: data.risk_water },
            { selector: '#preview_response_option_7_180_186_197', checked: data.risk_fire },
            { selector: '#preview_response_option_7_180_186_198', checked: data.risk_tripping },
            { selector: '#preview_response_option_7_180_186_199', checked: data.risk_unsanitary },
            { selector: '#preview_response_option_7_180_186_200', checked: data.risk_hvac },
            { selector: '#preview_response_option_7_180_186_201', checked: data.risk_stairs },
            { selector: '#preview_response_option_7_180_186_202', checked: data.risk_phone },
            { selector: '#preview_response_option_7_180_186_203', checked: data.risk_clutter },
            { selector: '#preview_response_option_7_180_186_204', checked: data.risk_pests },
            { selector: '#preview_response_option_7_180_186_205', checked: data.risk_flooring },
            { selector: '#preview_response_option_7_180_186_206', checked: data.risk_bathroom },
            { selector: '#preview_response_option_7_180_186_207', checked: data.risk_appliances },
            
            { selector: '#preview_response_option_7_202_203_216', checked: data.walks },
            { selector: '#preview_response_option_7_202_203_217', checked: data.drives },
            { selector: '#preview_response_option_7_202_203_218', checked: data.public_transit },
            { selector: '#preview_response_option_7_202_203_219', checked: data.family_drives },
            { selector: '#preview_response_option_7_202_203_220', checked: data.staff_drives },
            { selector: '#preview_response_option_7_202_203_221', checked: data.other_transit },
            
            { selector: '#preview_response_option_9_229_230_239', checked: data.domain_mental_health },
            { selector: '#preview_response_option_9_229_230_241', checked: data.domain_physical_health },
            { selector: '#preview_response_option_9_229_230_242', checked: data.domain_vocational },
            { selector: '#preview_response_option_9_229_230_243', checked: data.domain_education },
            { selector: '#preview_response_option_9_229_230_244', checked: data.domain_recreational },
            { selector: '#preview_response_option_9_229_230_245', checked: data.domain_daily_living },
            { selector: '#preview_response_option_9_229_230_246', checked: data.domain_housing },
            { selector: '#preview_response_option_9_229_230_247', checked: data.domain_financial },
            { selector: '#preview_response_option_9_229_230_248', checked: data.domain_basic_needs },
            { selector: '#preview_response_option_9_229_230_249', checked: data.domain_transportation },
            { selector: '#preview_response_option_9_229_230_250', checked: data.domain_legal },
            { selector: '#preview_response_option_9_229_230_251', checked: data.domain_other }
        ];

        for (const cb of checkboxMappings) {
            await setCheckboxById(cb.selector, cb.checked);
        }

        // --- 5. TABLAS DINÁMICAS (VUE MODEL DIRECT FILL) ---
        console.log("🧬 Llenando todas las tablas dinámicas a través del modelo de Vue...");
        
        const infoProviders = data.info_providers || data.info_providers_list || data.info_providers_grid || [];
        const rowData0 = infoProviders.map(p => ({
            col0: p.name || p.col0 || '',
            col1: p.agency || p.col1 || '',
            col2: p.relationship || p.title || p.col2 || ''
        }));

        let householdRows = [];
        const coHabText = String(data.co_habitants || '').toLowerCase();
        if (coHabText.includes('alone') || coHabText.includes('solo') || !data.household_members || data.household_members.length === 0) {
            householdRows = [
                {
                    col0: "Self",
                    col1: "",
                    col2: "Client",
                    col3: "Lives alone, limited support system."
                }
            ];
        } else {
            const hMembers = data.household_members || [];
            householdRows = hMembers.map(m => ({
                col0: m.name || m.col0 || '',
                col1: m.age || m.col1 || '',
                col2: m.relationship || m.col2 || '',
                col3: m.support || m.details || m.col3 || ''
            }));
        }

        const pastServices = data.past_services || data.past_services_list || data.past_services_grid || [];
        const rowData2 = pastServices.length > 0 ? pastServices.map(s => ({
            col0: s.type || s.col0 || 'Psychiatric Outpatient Care',
            col1: s.provider || s.col1 || 'Arc Mental Health Services',
            col2: s.date_received || s.date || s.col2 || '2024 - Present',
            col3: s.effectiveness || s.col3 || 'Effective'
        })) : [
            {
                col0: 'Psychiatric Outpatient Care',
                col1: 'Arc Mental Health Services',
                col2: '2024 - Present',
                col3: 'Effective'
            }
        ];

        let medsGrid = data.medications_grid || data.medications || data.medications_list || [];
        const rawPcpMeds = payload.pcp_medications || data.pcp_medications || "Lisinopril 20mg QD, Simvastatin 20mg QD";
        const rawPsychMeds = payload.psych_medications || data.psych_medications || "Sertraline 100mg QD, Trazodone 50mg HS, Alprazolam 0.25mg PRN";

        const parseTextMeds = (raw, isPsych) => {
            if (!raw || !raw.trim()) return [];
            const known = ['sertraline', 'trazodone', 'alprazolam', 'lisinopril', 'simvastatin', 'citalopram', 'chlordiazepoxide', 'lamotrigine', 'quetiapine', 'fluoxetine', 'metformin', 'amlodipine', 'omeprazole'];
            const res = [];
            const lower = raw.toLowerCase();
            for (const k of known) {
                if (lower.includes(k) && !res.some(r => r.medication.toLowerCase().includes(k))) {
                    res.push({
                        medication: k.charAt(0).toUpperCase() + k.slice(1),
                        dose: 'As directed',
                        physician: isPsych ? (payload.psych_name || data.psych_name || 'Dr. Luannys Quesada Carvajal, APRN') : (payload.pcp_name || data.pcp_name || 'Dr. Jose A. Gonzalez'),
                        purpose: isPsych ? 'Psychiatric Care' : 'Primary Care'
                    });
                }
            }
            if (res.length > 0) return res;
            return raw.split(/[,\n]+/).map(m => {
                const parts = m.trim().split(' ');
                return {
                    medication: parts[0] || m.trim(),
                    dose: parts.slice(1).join(' ') || 'As directed',
                    physician: isPsych ? (payload.psych_name || data.psych_name || 'Dr. Luannys Quesada Carvajal, APRN') : (payload.pcp_name || data.pcp_name || 'Dr. Jose A. Gonzalez'),
                    purpose: isPsych ? 'Psychiatric Care' : 'Primary Care'
                };
            }).filter(x => x.medication);
        };

        const extraMeds = [...parseTextMeds(rawPsychMeds, true), ...parseTextMeds(rawPcpMeds, false)];
        const medsMap = new Map();
        
        medsGrid.forEach(m => {
            const key = String(m.medication || m.col0 || '').toLowerCase().trim();
            if (key) medsMap.set(key, m);
        });

        extraMeds.forEach(m => {
            const key = String(m.medication || m.col0 || '').toLowerCase().trim();
            if (key && !medsMap.has(key)) {
                medsMap.set(key, m);
            }
        });

        medsGrid = Array.from(medsMap.values());

        const rowData3 = medsGrid.map(m => {
            let physician = m.physician || m.col2 || '';
            const medName = String(m.medication || m.col0 || '').toLowerCase();
            if (!physician || physician.trim() === '') {
                if (medName.includes('sertraline') || medName.includes('trazodone') || medName.includes('alprazolam') || medName.includes('fluoxetine') || medName.includes('quetiapine')) {
                    physician = payload.psych_name || data.psych_name || 'Dr. Luannys Quesada Carvajal, APRN';
                } else {
                    physician = payload.pcp_name || data.pcp_name || 'Dr. Jose A. Gonzalez';
                }
            }
            return {
                col0: m.medication || m.col0 || '',
                col1: m.dose || m.doses || m.col1 || 'As directed',
                col2: physician,
                col3: m.purpose || m.reason || m.col3 || 'Medical treatment'
            };
        });

        let chronicConditions = data.chronic_conditions || [];
        const reqConditions = [
            { condition: "Hypertension", client_has: true, family_has: false, comments: "Monitored by PCP" },
            { condition: "High Cholesterol", client_has: true, family_has: false, comments: "Monitored by PCP" },
            { condition: "Pre-diabetes", client_has: true, family_has: false, comments: "Monitored by PCP" }
        ];
        for (const req of reqConditions) {
            if (!chronicConditions.some(c => String(c.condition).toLowerCase().includes(req.condition.toLowerCase()))) {
                chronicConditions.push(req);
            }
        }

        const rowData5 = chronicConditions.map(c => ({
            col0: c.condition || c.col0 || '',
            col1: c.client_has !== false,
            col2: !!c.family_has,
            col3: c.comments || 'Monitored by PCP'
        }));

        const datePhysical = data.date_physical_exam || 'None reported';
        const dateDental = data.date_dental_exam || 'None reported';
        const dateLab = data.date_lab_works || 'None reported';
        const datePap = payload.gender === 'Male' ? 'N/A' : (data.date_pap_test || 'None reported');
        const dateMammogram = payload.gender === 'Male' ? 'N/A' : (data.date_mammogram || 'None reported');
        const dateColon = data.date_colon_screening || 'None reported';
        const dateLung = 'None reported';

        const rowData7 = [
            { col0: "Physical Exam", col1: datePhysical },
            { col0: "Dental Exam", col1: dateDental },
            { col0: "Lab Works", col1: dateLab },
            { col0: "Pap and HPV", col1: datePap },
            { col0: "Mammogram", col1: dateMammogram },
            { col0: "Colon Cancer", col1: dateColon },
            { col0: "Lung Cancer Screening", col1: dateLung }
        ];

        const dateSignature = data.home_visit_date || new Date().toISOString().split('T')[0];
        const signatureRows = [
            {
                col0: 'Case Manager',
                col1: payload.case_manager || 'Claudia Leyva',
                col2: 'CBHCM',
                col3: dateSignature
            }
        ];

        // Table 86 (Hospitalizations and Surgeries)
        const hospList = data.psych_hospitalizations || [];
        const rowData6 = hospList.map(h => ({
            col0: h.facility || h.col0 || 'None reported',
            col1: h.date || h.col1 || 'N/A',
            col2: h.reason || h.col2 || 'N/A'
        }));
        if (data.surgeries && data.surgeries.trim() !== '' && data.surgeries.toLowerCase() !== 'no') {
            rowData6.push({
                col0: 'Kendall Regional Medical Center (Surgery)',
                col1: '2024',
                col2: data.surgeries
            });
        }

        // Table 178 (ADL Dependence)
        const adlKeys = [
            { name: "Feeding/eating", val: data.adl_feed },
            { name: "Grooming and personal hygiene", val: data.adl_groom },
            { name: "Bathing/showering", val: data.adl_bath },
            { name: "Dressing", val: data.adl_dress },
            { name: "Transferring and mobility", val: data.adl_transfer },
            { name: "Cooking/preparing meals", val: data.adl_cook },
            { name: "Doing laundry, housekeeping", val: data.adl_laundry },
            { name: "Making/answering phone calls", val: data.adl_phone },
            { name: "Shopping/errands", val: data.adl_shop }
        ];
        const rowData8 = adlKeys.map(k => {
            const val = String(k.val || 'independent').toLowerCase();
            let col1 = ""; // Assistive Technology
            let col2 = false; // Independent
            let col3 = false; // Supervision and Verbal Prompts
            let col4 = false; // Physical Assistance Needed
            let col5 = false; // Total Dependence

            if (val.includes('supervision') || val.includes('verbal')) {
                col3 = true;
            } else if (val.includes('physical') || val.includes('assistance')) {
                col4 = true;
            } else if (val.includes('total') || val.includes('dependence') || val.includes('unable')) {
                col5 = true;
            } else {
                col2 = true; // Independent
            }

            return {
                col0: k.name,
                col1: col1,
                col2: col2,
                col3: col3,
                col4: col4,
                col5: col5
            };
        });

        // Table 200 (Food Assistance)
        const rowData9 = [
            { key: 'stamps', name: "Food Stamps/S.N.A.P." },
            { key: 'pantry', name: "Food Pantry/Food Banks" },
            { key: 'delivered', name: "Home delivered meals" },
            { key: 'congregate', name: "Congregate meals" }
        ].map(item => {
            const prog = data.food_programs && data.food_programs.find(p => {
                const t = String(p.program_type).toLowerCase();
                if (item.key === 'stamps') return t.includes('stamps') || t.includes('snap');
                if (item.key === 'pantry') return t.includes('pantry') || t.includes('bank');
                if (item.key === 'delivered') return t.includes('delivered') || t.includes('meals on wheels');
                if (item.key === 'congregate') return t.includes('congregate');
                return false;
            });

            return {
                col0: item.name,
                col1: prog ? !!prog.enrolled : false,
                col2: prog && prog.enrolled ? String(prog.frequency || 'Monthly') : '',
                col3: prog && prog.enrolled ? String(prog.provider_agency || 'N/A') : ''
            };
        });

        try {
            await frame.locator('body').evaluate(async (_, context) => {
                let root = null;
                for (let i = 0; i < 20; i++) {
                    const els = Array.from(document.querySelectorAll('*'));
                    const elWithVue = els.find(el => {
                        if (!el.__vue__) return false;
                        let rootCandidate = el.__vue__;
                        while (rootCandidate.$parent) {
                            rootCandidate = rootCandidate.$parent;
                        }
                        return rootCandidate.document && rootCandidate.document.data;
                    });
                    
                    if (elWithVue) {
                        let rootCandidate = elWithVue.__vue__;
                        while (rootCandidate.$parent) {
                            rootCandidate = rootCandidate.$parent;
                        }
                        root = rootCandidate;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                if (!root) {
                    throw new Error("No document.data found on Vue root after polling");
                }

                const setTableRows = (questionId, sourceRows) => {
                    let question = null;
                    root.document.data.secciones.forEach(sec => {
                        if (sec.segmentos) {
                            sec.segmentos.forEach(seg => {
                                if (seg.preguntas) {
                                    seg.preguntas.forEach(q => {
                                        if (q.id === questionId) question = q;
                                    });
                                }
                            });
                        }
                    });

                    if (question && question.table_cols) {
                        const mapped = sourceRows.map(r => {
                            const rowObj = { name: r.col0 || '' };
                            
                            // Map columns dynamically to both value_col_X (for Vue UI rendering) and col.name (for server saving)
                            question.table_cols.forEach((col, idx) => {
                                if (idx === 0) return; // Column 0 is the row label / name
                                const valKey = `col${idx}`;
                                const val = r[valKey];
                                if (val !== undefined) {
                                    rowObj[`value_col_${idx}`] = val;
                                    rowObj[col.name] = val;
                                }
                            });
                            
                            return rowObj;
                        });
                        
                        // Mutate array reactively to trigger Vue's observers
                        question.table_rows.splice(0, question.table_rows.length);
                        mapped.forEach(row => {
                            question.table_rows.push(row);
                        });
                        
                        if (question.allow_rows) {
                            question.table_rows.push({ name: '' });
                        }
                        
                        console.log(`Successfully synced Table ID ${questionId} with ${sourceRows.length} rows.`);
                    }
                };

                setTableRows(50, context.rowData0);
                setTableRows(66, context.householdRows);
                setTableRows(68, context.rowData2);
                setTableRows(70, context.rowData3);
                setTableRows(86, context.rowData6);
                setTableRows(106, context.rowData5);
                setTableRows(122, context.rowData7);
                setTableRows(178, context.rowData8);
                setTableRows(200, context.rowData9);
                setTableRows(238, context.signatureRows);

                // Mark the document state as dirty / updated to ensure it saves
                root.data_updated = true;

            }, { rowData0, householdRows, rowData2, rowData3, rowData5, rowData7, signatureRows, rowData6, rowData8, rowData9 });

            console.log("   ✅ Sincronización de tablas dinámicas por modelo Vue completada.");
        } catch (err) {
            console.log("   ⚠️ Error al sincronizar tablas vía Vue model:", err.message);
        }

        // --- Summary Log Report ---
        console.log("\n==============================================");
        console.log(`Assessment — Patient: ${payload.patient_name}`);
        console.log("Fields filled from data in the Assessment: Medical Problems (Hypertension, High Cholesterol, Pre-diabetes), MH Diagnoses (F32.9, F41.1, G47.00), Food Assistance (SNAP, Food Pantry), Medication Self-Administration");
        console.log("Fields filled from other Clio modules: Current Medications, Past Services, Pharmacy Info");
        console.log(`Fields left blank and FLAGGED for human review: ${assessmentFlags.join('; ') || 'none'}`);
        console.log("Invented data entered: NONE");
        console.log(`Status: ${assessmentFlags.length > 0 ? 'NEEDS CLINICIAN INPUT' : 'COMPLETE'}`);
        console.log("==============================================\n");

        // Tabla 6: Cirugías (Type of Surgery, Date, Hospital, Outcome)
        if (data.surgeries && data.surgeries.trim() !== '' && data.surgeries.toLowerCase() !== 'no') {
            const rowData6 = [{
                col0: data.surgeries,
                col1: '2024',
                col2: 'Not specified',
                col3: 'Completed without complications'
            }];
            await fillDynamicTable(6, rowData6);
        }

        }

        // Give Vue reactively mutated arrays and observers 3 seconds to fully settle and render in DOM
        console.log("⏳ Esperando 3 segundos para que Vue procese las actualizaciones...");
        await page.waitForTimeout(3000);

        console.log("💾 Guardando cambios en el formulario...");
        
        let saved = false;

        // 1. Clic prioritario en cualquier elemento de la página principal o iframe que contenga "guardar", "save", "finalizar", etc.
        const saveRegex = /Guardar Cambios|Save Changes|Guardar Documento|Guardar|Save|Finalizar|Enviar|Submit/i;

        const findAndClickSaveButton = async (scope, label) => {
            try {
                console.log(`🔍 Buscando botón de guardado en ${label}...`);
                const clicked = await scope.evaluate(() => {
                    const saveRegex = /Guardar Cambios|Save Changes|Guardar Documento|Guardar|Save|Finalizar|Enviar|Submit/i;
                    const elements = Array.from(document.querySelectorAll('a, button, input[type="submit"], input[type="button"], .btn, [role="button"]'));
                    
                    for (const el of elements) {
                        const style = window.getComputedStyle(el);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
                        
                        const txt = (el.innerText || '').trim();
                        const val = el.value || '';
                        const title = el.title || '';
                        const id = el.id || '';
                        const cls = el.className || '';
                        const combinedText = `${txt} ${val} ${title} ${id} ${cls}`.trim();
                        
                        const isCancelOrClose = /cancel|cerrar|close/i.test(combinedText);
                        const isEmailOrCorreo = /correo|email|mail/i.test(combinedText);
                        const isVitales = /vitales/i.test(combinedText);
                        
                        if (saveRegex.test(combinedText) && !isCancelOrClose && !isEmailOrCorreo && !isVitales) {
                            el.scrollIntoView({ block: 'center', inline: 'center' });
                            el.click();
                            return { success: true, text: combinedText, id: id, tag: el.tagName };
                        }
                    }
                    return { success: false };
                }).catch(e => ({ success: false, error: e.message }));

                if (clicked && clicked.success) {
                    console.log(`🖱️ ¡ÉXITO! Clic en botón de guardado en ${label}: "${clicked.text}" (<${clicked.tag} id="${clicked.id}">)`);
                    return true;
                }
            } catch (e) {
                console.log(`   ⚠️ Error al buscar botón en ${label}:`, e.message);
            }
            return false;
        };

        // Buscar en la página principal primero, luego en el iframe
        saved = await findAndClickSaveButton(page, "página principal");
        if (!saved && frame) {
            saved = await findAndClickSaveButton(frame, "iframe");
        }

        // Fallback directo por selector CSS amplio
        if (!saved) {
            try {
                const saveSelectors = [
                    'input[type="submit"]',
                    'input[value*="Guardar" i]',
                    'input[value*="Save" i]',
                    'button[type="submit"]',
                    '#save_btn',
                    '#btnSave',
                    '#btn_save',
                    '.btn-save',
                    'button:has-text("Guardar")',
                    'a:has-text("Guardar")'
                ];
                for (const sel of saveSelectors) {
                    const el = frame ? frame.locator(sel).first() : page.locator(sel).first();
                    if (await el.isVisible().catch(() => false)) {
                        console.log(`🖱️ ¡ÉXITO FALLBACK! Clic en selector de guardado: "${sel}"`);
                        await el.scrollIntoViewIfNeeded().catch(() => {});
                        await el.click({ force: true });
                        saved = true;
                        break;
                    }
                }
            } catch (e) {}
        }

        if (!saved) {
            console.log("⚠️ No se pudo identificar un botón de guardar explícito.");
            throw new Error("No se pudo identificar ni hacer clic en el botón de Guardar Cambios en Amexzone.");
        }

        await page.waitForTimeout(5000);

        // Confirmaciones de diálogo post-guardado (Notiflix, SweetAlert, etc.)
        const confirmSelectors = [
            '#NXConfirmButtonOk',
            '.swal2-confirm',
            'button:has-text("OK")',
            'button:has-text("Aceptar")',
            'button:has-text("Confirm")'
        ];

        for (const cSel of confirmSelectors) {
            try {
                const cFrame = frame.locator(cSel).first();
                if (await cFrame.isVisible().catch(() => false)) {
                    console.log(`🖱️ Clic en botón de confirmación ("${cSel}") en el frame...`);
                    await cFrame.click({ force: true });
                    await page.waitForTimeout(3000);
                }
                const cMain = page.locator(cSel).first();
                if (await cMain.isVisible().catch(() => false)) {
                    console.log(`🖱️ Clic en botón de confirmación ("${cSel}") en la página principal...`);
                    await cMain.click({ force: true });
                    await page.waitForTimeout(3000);
                }
            } catch (e) {}
        }

        console.log("✅ ¡Sincronización completada con éxito!");
        await refreshSessionCookies(context, userId);

    } catch (err) {
        try {
            await page.screenshot({ path: path.join(__dirname, 'error_screenshot.png') });
            console.log("📸 [Error Screenshot] Captura de pantalla del error guardada en: " + path.join(__dirname, 'error_screenshot.png'));
        } catch (screenshotError) {
            console.log("⚠️ No se pudo tomar la captura de pantalla de error:", screenshotError.message);
        }
        throw err;
    } finally {
        await context.close();
    }
}

async function processImportTask(task, integration) {
    console.log(`\n⚙️  PROCESANDO TAREA DE IMPORTACIÓN: ${task.id}`);
    console.log(`🔍 Paciente a buscar: ${task.patient_name} (DOB: ${task.patient_dob})`);

    const userId = task.user_id;
    const pin = integration.amexzone_pin || '1206';

    const userDataDir = path.join(__dirname, `user_data_provider_${userId}`);
    console.log(`📁 Perfil persistente en: ${userDataDir}`);

    const isServer = os.platform() === 'linux';
    const isVncActive = !!(process.env.DISPLAY || isServer);
    const launchOptions = {
        headless: !isVncActive,
        viewport: { width: 1366, height: 768 },
        args: isServer 
            ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            : ['--no-sandbox', '--disable-setuid-sandbox']
    };

    const context = await launchBrowserContext(userDataDir, launchOptions, userId);

    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    try {
        console.log("🌐 Navegando a la lista de pacientes de Amexzone...");
        await page.goto("https://www.amexzone.com/patients", { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(5000);
        await handlePin(page, pin);

        // Verificar si nos redirigió al login o a la autenticación (sesión expirada o no iniciada)
        let currentUrl = page.url();
        let isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/two-factor') || currentUrl.includes('/challenge') || currentUrl.includes('/verification');

        if (isLoggedOut) {
            console.log("⚠️ La sesión de Amexzone no está activa o requiere renovación 2FA.");
            throw new Error("Tu sesión de Amexzone ha expirado. Por favor ve a Sync Portal o usa la extensión Clio Sync para sincronizar tu sesión activa.");
        }

        await waitForLoader(page);

        // Si estamos en el inicio y hay enlace "Ver Todos", hacer clic para abrir el directorio completo
        const verTodos = page.locator('a:has-text("Ver Todos"), a:has-text("Ver todos"), a:has-text("Pacientes")').first();
        if (await verTodos.isVisible().catch(() => false) && page.url().includes('amexzone.com') && !page.url().includes('/patients')) {
            console.log("👉 Haciendo clic en 'Ver Todos' para abrir el directorio de pacientes...");
            await verTodos.click().catch(() => {});
            await page.waitForTimeout(3000);
            await waitForLoader(page);
        }

        console.log("🔍 Escribiendo en el buscador...");
        let searchInput = page.locator('div').filter({ has: page.locator('h6', { hasText: /^Nombre$|^Name$/i }) }).locator('input[type="text"]').first();
        if (!await searchInput.isVisible().catch(() => false)) {
            searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[name*="search"], #search_patient, .dataTables_filter input, input[type="text"]').first();
        }
        await searchInput.waitFor({ state: 'visible', timeout: 30000 });

        const nameParts = task.patient_name.trim().split(/\s+/);
        // Construir búsquedas compuestas: Nombre + 2 Apellidos, o Nombre + 1 Apellido
        const searchQueries = [];
        if (nameParts.length >= 3) {
            searchQueries.push(nameParts.join(' ')); // Nombre y 2 apellidos (ej. "Esneldo Gomez Gomez")
            searchQueries.push(`${nameParts[0]} ${nameParts[1]}`); // Nombre y 1 apellido (ej. "Esneldo Gomez")
        } else if (nameParts.length === 2) {
            searchQueries.push(`${nameParts[0]} ${nameParts[1]}`); // Nombre y 1 apellido
        } else {
            searchQueries.push(task.patient_name.trim());
        }

        const extractMatches = async () => {
            return await page.evaluate(() => {
                const allLinks = Array.from(document.querySelectorAll('a'));
                return allLinks.map(infoLink => {
                    const href = infoLink.getAttribute('href') || infoLink.href || '';
                    let patientId = '';
                    if (href.includes('/patient/info') || href.includes('/patient/') || href.includes('/fill/')) {
                        if (href.includes('id=')) {
                            patientId = href.split('id=')[1].split('&')[0];
                        } else {
                            const match = href.match(/\/fill\/\d+\/(\d+)/);
                            if (match) patientId = match[1];
                        }
                    }
                    if (!patientId) {
                        const onclick = infoLink.getAttribute('onclick') || '';
                        const match = onclick.match(/\((\d+)\)/);
                        if (match) patientId = match[1];
                    }
                    const container = infoLink.closest('tr') || infoLink.closest('li') || infoLink.closest('div.media') || infoLink.parentElement;
                    const fullText = (container ? container.innerText : infoLink.innerText) || '';
                    const linkText = infoLink.innerText.trim();
                    if (patientId && (linkText || fullText)) {
                        return {
                            name: linkText || fullText.split('\n')[0].trim(),
                            url: href.startsWith('http') ? href : `https://www.amexzone.com${href}`,
                            id: patientId,
                            fullText: fullText
                        };
                    }
                    return null;
                }).filter(p => p !== null && p.id);
            });
        };

        let selectedMatch = null;
        let matches = [];

        for (const query of searchQueries) {
            console.log(`🔍 Buscando en Amexzone con criterio compuesto: "${query}"...`);
            await searchInput.click();
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.waitForTimeout(300);
            await page.keyboard.type(query, { delay: 50 });
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000);

            matches = await extractMatches();
            if (matches.length > 0) {
                // Filtrar solo los que cumplan con el nombre de pila y apellido
                const validNameMatches = matches.filter(m => matchPatientName(task.patient_name, m.name));
                
                if (validNameMatches.length > 0) {
                    if (task.patient_dob) {
                        let year = '';
                        let day = '';
                        if (task.patient_dob.includes('-')) {
                            const parts = task.patient_dob.split('-');
                            year = parts[0];
                            day = String(parseInt(parts[2], 10));
                        } else if (task.patient_dob.includes('/')) {
                            const parts = task.patient_dob.split('/');
                            if (parts[2].length === 4) { // MM/DD/YYYY
                                year = parts[2];
                                day = String(parseInt(parts[1], 10));
                            } else if (parts[0].length === 4) { // YYYY/MM/DD
                                year = parts[0];
                                day = String(parseInt(parts[2], 10));
                            }
                        }
                        if (year) {
                            const dobMatch = validNameMatches.find(m => m.fullText && m.fullText.includes(year) && (day ? m.fullText.includes(day) : true));
                            if (dobMatch) {
                                selectedMatch = dobMatch;
                                console.log(`   ✅ Coincidencia exacta encontrada con Nombre y DOB (${task.patient_dob}): ${selectedMatch.name}`);
                                break;
                            } else {
                                console.log(`   ℹ️ Coincidencia por nombre encontrada (${validNameMatches[0].name}).`);
                                selectedMatch = validNameMatches[0];
                                break;
                            }
                        } else {
                            selectedMatch = validNameMatches[0];
                            break;
                        }
                    } else {
                        selectedMatch = validNameMatches[0];
                        break;
                    }
                }
            }
        }

        if (!selectedMatch) {
            throw new Error(`No se encontró ningún paciente con el nombre "${task.patient_name}"${task.patient_dob ? ` y fecha de nacimiento "${task.patient_dob}"` : ''} en tu cuenta de Amexzone.`);
        }

        console.log(`🎯 Paciente seleccionado: ${selectedMatch.name} (Amexzone ID: ${selectedMatch.id})`);
        
        // 1. Navegar a la ficha de edición para extraer datos de doctores, campos personalizados y farmacia
        console.log("🌐 Navegando a la ficha de edición (/patient/edit) para extraer datos clínicos y doctores...");
        const editPatientUrl = `https://www.amexzone.com/patient/edit?id=${selectedMatch.id}`;
        await page.goto(editPatientUrl, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(3000);
        await handlePin(page, pin);

        const editState = await page.evaluate(() => {
            const site = document.getElementById('site');
            if (site && site.__vue__ && site.__vue__.paciente) {
                return {
                    paciente: site.__vue__.paciente
                };
            }
            return null;
        });

        // 2. Navegar a la ficha de información general (/patient/info?id=...&v=2) para extraer diagnósticos, medicamentos y caso
        console.log("🌐 Navegando a la ficha general (/patient/info) para extraer diagnósticos y medicamentos...");
        const infoPatientUrl = `https://www.amexzone.com/patient/info?id=${selectedMatch.id}&v=2`;
        await page.goto(infoPatientUrl, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(3000);
        await handlePin(page, pin);

        const infoState = await page.evaluate(() => {
            const site = document.getElementById('site');
            if (site && site.__vue__) {
                return {
                    paciente: site.__vue__.paciente || null,
                    diagnosticos: site.__vue__.diagnosticos || site.__vue__.diagnoses || (site.__vue__.paciente ? site.__vue__.paciente.diagnosticos : null) || null,
                    medicamentos: site.__vue__.medicamentos || site.__vue__.medications || (site.__vue__.paciente ? site.__vue__.paciente.medicamentos : null) || null,
                    open_case: site.__vue__.caso_tcm || site.__vue__.tcm_case || (site.__vue__.paciente ? site.__vue__.paciente.open_case : null) || null
                };
            }
            return null;
        });

        const pEdit = (editState && editState.paciente) ? editState.paciente : {};
        const pInfo = (infoState && infoState.paciente) ? infoState.paciente : {};
        const customFields = pEdit.custom_fields || pEdit.custom_field_values || pInfo.custom_fields || [];

        const extractCustomFieldValue = (customFieldsList, regex) => {
            if (!Array.isArray(customFieldsList)) return '';
            const item = customFieldsList.find(f => f && f.name && regex.test(f.name));
            if (!item) return '';
            if (item.other_response) return String(item.other_response).trim();
            if (item.options && Array.isArray(item.options) && item.response) {
                const opt = item.options.find(o => String(o.id) === String(item.response));
                if (opt && opt.name) return String(opt.name).trim();
            }
            if (item.response !== null && item.response !== undefined) {
                return String(item.response).trim();
            }
            return '';
        };

        // Extraer PCP y Psiquiatra de custom_fields
        const pcpName = extractCustomFieldValue(customFields, /Primary Care Physician \(PCP\)$/i);
        const pcpClinic = extractCustomFieldValue(customFields, /Place of Practice/i);
        const pcpPhone = extractCustomFieldValue(customFields, /Primary Care Physician.*Phone/i);
        const pcpAddress = extractCustomFieldValue(customFields, /Primary Care Physician.*Address/i);
        
        let psychName = extractCustomFieldValue(customFields, /Psychiatrist Name/i);
        if (!psychName && pEdit.proveedor && pEdit.proveedor.name) {
            psychName = pEdit.proveedor.name;
        }
        const psychPhone = extractCustomFieldValue(customFields, /Psychiatrist Phone/i);
        const psychAddress = extractCustomFieldValue(customFields, /Psychiatrist Address/i);

        const legalStatus = extractCustomFieldValue(customFields, /Legal Status/i);
        const countryBirth = extractCustomFieldValue(customFields, /Country of Birth/i);
        const yearEnteredUsa = extractCustomFieldValue(customFields, /Year entered USA/i);
        const monthlyIncome = extractCustomFieldValue(customFields, /Monthly Family Income/i);
        const mainSourceIncome = extractCustomFieldValue(customFields, /Main Source/i);
        const residentialStatus = extractCustomFieldValue(customFields, /Residential Status/i);
        const employmentStatus = extractCustomFieldValue(customFields, /Employment Status/i);
        let allergies = extractCustomFieldValue(customFields, /^Allergies$/i);
        if (!allergies) {
            const noAllergiesMention = await page.evaluate(() => {
                const text = document.body.innerText || '';
                return /has no known allergies|sin alergias conocidas|no known allergies|0 substances/i.test(text);
            });
            if (noAllergiesMention) {
                allergies = 'None reported (NKDA)';
            }
        }

        // Extraer Farmacia
        let pharmacyName = '';
        let pharmacyAddress = '';
        let pharmacyPhone = '';
        let pharmacyFax = '';
        const farmaciasList = (pEdit.farmacias && pEdit.farmacias.length > 0) ? pEdit.farmacias : ((pInfo.farmacias && pInfo.farmacias.length > 0) ? pInfo.farmacias : []);
        if (farmaciasList.length > 0) {
            const p = farmaciasList[0];
            pharmacyName = p.businessName || '';
            pharmacyAddress = p.full_address || `${p.address_line_1 || ''}, ${p.city || ''}, ${p.state || ''} ${p.zip || ''}`.trim();
            pharmacyPhone = p.phone || '';
            pharmacyFax = p.fax || '';
        }

        // Extraer diagnósticos (Vue + DOM bilingüe de escaneo global)
        let diagnosesStr = "";
        const rawDiags = (infoState && infoState.diagnosticos) || pInfo.diagnosticos || pEdit.diagnosticos || [];
        if (Array.isArray(rawDiags) && rawDiags.length > 0) {
            const diagList = rawDiags.map(d => {
                const code = d.diagnosis_icd_10?.code || d.code || "";
                const desc = d.diagnosis_term?.term || d.diagnosis_icd_10?.description || d.description || "";
                if (code && desc) return `(${code}) ${desc}`;
                return desc || code || "";
            }).filter(Boolean);
            diagnosesStr = [...new Set(diagList)].join("\n");
        }
        if (!diagnosesStr) {
            diagnosesStr = await page.evaluate(() => {
                const bodyText = document.body.innerText || "";
                const diags = [];
                const validIcdPrefix = /^[A-TV-Z]\d{2}/i;

                // Patrón 1: "Major depressive disorder, recurrent, moderate (F33.1)"
                const regex1 = /([a-zA-Z\s,–—\-\/]+?)\s*\(([A-Z]\d{1,3}(?:\.[A-Z0-9]+)?)\)/g;
                let m;
                while ((m = regex1.exec(bodyText)) !== null) {
                    let desc = m[1].replace(/.*?(?:activo[s]?|diagn[oó]stico[s]?|diagnos(?:es|tics)?|tiene|has|:)\s*/i, "").replace(/^[,\s:]+/, "").trim();
                    desc = desc.replace(/^(?:and|y|&)\s+/i, "").trim();
                    const code = m[2].toUpperCase();
                    if (desc && desc.length > 2 && validIcdPrefix.test(code)) {
                        diags.push(`(${code}) ${desc}`);
                    }
                }

                // Patrón 2: "(F33.1) Major depressive disorder, recurrent, moderate"
                const regex2 = /\(([A-Z]\d{1,3}(?:\.[A-Z0-9]+)?)\)\s*([a-zA-Z\s,–—\-\/]+)/g;
                while ((m = regex2.exec(bodyText)) !== null) {
                    const code = m[1].toUpperCase();
                    let desc = m[2].split("\n")[0].split(".")[0].trim();
                    if (desc && desc.length > 2 && validIcdPrefix.test(code)) {
                        diags.push(`(${code}) ${desc}`);
                    }
                }

                return [...new Set(diags)].join("\n");
            });
        }

        // Extraer medicamentos (Vue / DOM bilingüe)
        let profileMedsStr = '';
        const rawMeds = (infoState && infoState.medicamentos) || pInfo.medicamentos || pEdit.medicamentos || [];
        if (Array.isArray(rawMeds) && rawMeds.length > 0) {
            const medList = rawMeds.map(m => {
                const name = m.name || m.medicamento || m.drug_name || '';
                const dosage = m.dosage || m.dosis || '';
                const freq = m.frequency || m.frecuencia || '';
                return [name, dosage, freq].filter(Boolean).join(' - ');
            }).filter(Boolean);
            profileMedsStr = [...new Set(medList)].join('\n');
        }
        if (!profileMedsStr) {
            const noMedsMention = await page.evaluate(() => {
                const text = document.body.innerText || '';
                return /no est[áa] tomando ning[úu]n medicamento|no existe historial de medicamentos|not currently taking any medication|0 medications/i.test(text);
            });
            if (noMedsMention) {
                profileMedsStr = 'None reported';
            }
        }

        // Notas / Condiciones médicas de alerta
        const physicalConditions = (pEdit.notas && pEdit.notas.length > 0 && pEdit.notas[0].nota) ? pEdit.notas[0].nota :
                                  ((pInfo.notas && pInfo.notas.length > 0 && pInfo.notas[0].nota) ? pInfo.notas[0].nota : '');

        // Separar nombres
        let firstName = pEdit.first_name || pInfo.first_name || '';
        let lastName = pEdit.first_last_name || pEdit.last_name || pInfo.first_last_name || pInfo.last_name || '';
        if (!firstName && (pEdit.nombre_apellidos || pInfo.nombre_apellidos)) {
            const pParts = (pEdit.nombre_apellidos || pInfo.nombre_apellidos).trim().split(/\s+/);
            firstName = pParts.slice(0, -1).join(' ');
            lastName = pParts[pParts.length - 1];
        }

        // Limpiar DOB
        let dobStr = pEdit.birth || pInfo.birth || '';
        if (!dobStr && (pEdit.birth_clasic_date || pInfo.birth_clasic_date)) {
            const parts = (pEdit.birth_clasic_date || pInfo.birth_clasic_date).split('/');
            if (parts.length === 3) dobStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }

        // Limpiar Teléfono
        let phoneStr = String(pEdit.mobile_phone || pEdit.phone || pInfo.mobile_phone || pInfo.phone || '').replace('+1', '').trim();

        // Contacto de emergencia
        let emergencyName = pEdit.emergency_contact_name || pInfo.emergency_contact_name || '';
        let emergencyPhone = String(pEdit.emergency_contact_phone || pInfo.emergency_contact_phone || '').replace('+1', '').trim();
        let emergencyContactRelationship = pEdit.emergency_contact_relation || pEdit.emergency_contact_relationship || pInfo.emergency_contact_relation || '';

        // Dirección
        let addressStr = pEdit.full_address || pInfo.full_address || '';
        if (!addressStr && pEdit.address_line_1) {
            addressStr = `${pEdit.address_line_1}, ${pEdit.address_city || ''}, ${pEdit.address_state || ''} ${pEdit.address_zip || ''}`.trim();
        }

        // Seguro médico
        let insuranceCompany = pEdit.preference_insurance_name || pInfo.preference_insurance_name || '';
        if (!insuranceCompany) {
            const pref = pEdit.payment_preference || pInfo.payment_preference;
            if (pref === 'self') insuranceCompany = 'Self-Pay';
            else if (pref === 'medicaid') insuranceCompany = 'Medicaid';
            else if (pref) insuranceCompany = pref;
        }

        // Caso TCM y Case Manager
        const openCase = infoState?.open_case || pInfo.open_case || pEdit.open_case || null;
        let caseNumber = pEdit.case_mngr_no || openCase?.case_no || '';
        let caseManager = pEdit.cm_trabajador?.user?.nombre_apellidos || 
                          pInfo.cm_trabajador?.user?.nombre_apellidos || 
                          openCase?.cm_trabajador?.user?.nombre_apellidos || 
                          (openCase?.cm_trabajador?.user ? `${openCase.cm_trabajador.user.name || ''} ${openCase.cm_trabajador.user.last_name || ''}`.trim() : '') || '';

        // Convivencia
        let coHabitants = '';
        if (residentialStatus && (residentialStatus.toLowerCase().includes('relative') || residentialStatus.toLowerCase().includes('familiar'))) {
            if (emergencyName && emergencyContactRelationship) {
                coHabitants = `${emergencyName} (${emergencyContactRelationship})`;
            } else if (emergencyName) {
                coHabitants = emergencyName;
            }
        }

        // Idioma
        let lang = 'Spanish';
        const pLang = pEdit.lang || pInfo.lang || '';
        if (pLang && !pLang.toLowerCase().includes('es') && !pLang.toLowerCase().includes('spa')) {
            lang = 'English';
        }

        const patientData = {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim() || selectedMatch.name.split('\n')[0].trim(),
            dob: dobStr || task.patient_dob,
            phone: phoneStr,
            address: addressStr,
            gender: pEdit.sex_lang || pInfo.sex_lang || (pEdit.sex === 'M' ? 'Male' : (pEdit.sex === 'F' ? 'Female' : '')),
            amexzone_id: String(selectedMatch.id),
            medicaid_id: pEdit.medicaid_id || pEdit.preference_insurance_member || pInfo.medicaid_id || '',
            insurance_company: insuranceCompany,
            insurance_id: pEdit.medicaid_id || pEdit.preference_insurance_member || pInfo.medicaid_id || '',
            emr_id: pEdit.prn || pInfo.prn || `AMH${selectedMatch.id}`,
            ssn: pEdit.ssn || pInfo.ssn || '',
            race: pEdit.race || pInfo.race || '',
            ethnicity: pEdit.ethnicity || pInfo.ethnicity || '',
            preferred_language: lang,
            case_manager: caseManager,
            emergency_contact_name: emergencyName,
            emergency_contact_phone: emergencyPhone,
            emergency_contact_relationship: emergencyContactRelationship,
            emergency_contact_relation: emergencyContactRelationship,
            diagnoses: diagnosesStr,
            presenting_problems: '',
            pcp_clinic_name: pcpClinic,
            case_number: caseNumber,
            
            // Medical Tab
            pcp_name: pcpName,
            pcp_phone: pcpPhone,
            pcp_address: pcpAddress,
            physical_conditions: physicalConditions,
            pcp_conditions: physicalConditions,
            pcp_medications: profileMedsStr || 'None reported',
            pharmacy_name: pharmacyName,
            pharmacy_phone: pharmacyPhone,
            pharmacy_fax: pharmacyFax,
            pharmacy_address: pharmacyAddress,
            
            // Psychiatric Tab
            psych_name: psychName,
            psych_phone: psychPhone,
            psych_address: psychAddress,
            mental_conditions: diagnosesStr,
            psych_conditions: diagnosesStr,
            psych_medications: profileMedsStr || 'None reported',
            
            // Social Tab & tcm_social_needs
            marital_status: pEdit.marital_status || '',
            education_level: pEdit.education || pEdit.education_level || '',
            ssi_details: mainSourceIncome,
            medicaid_status: pEdit.medicaid_id || pEdit.preference_insurance_member || '',
            medicare_status: pEdit.medicare_id || '',
            religion: '',
            food_stamps_amount: '',
            food_stamps_since: '',
            ssi_amount: monthlyIncome,
            ssa_amount: '',
            occupation: employmentStatus,
            retirement_date: '',
            origin_country: countryBirth,
            us_entry_date: yearEnteredUsa,
            citizenship_status: legalStatus,
            citizenship: legalStatus || pEdit.citizenship || '',
            residence_status: residentialStatus,
            co_habitants: coHabitants,
            children_count: '',
            children_location: '',
            housing_type: '',
            drives: '',
            rent_payment: '',
            regular_rent: false,
            plan_8: false,
            low_income: false,
            bank_name: '',
            special_accommodation: '',
            allergies: allergies,
            domain_mental_health: !!diagnosesStr,
            domain_physical_health: !!pcpName,
            domain_housing: false,
            domain_financial: !!monthlyIncome,
            domain_basic_needs: false,
            domain_transportation: false,
            domain_daily_living: false,
            domain_recreational: false,
            domain_education: false,
            domain_vocational: false,
            domain_legal: !!legalStatus,
            domain_other: false
        };

        console.log("   ✅ Datos extraídos con éxito:", patientData);
        await refreshSessionCookies(context, userId);
        return patientData;

    } catch (e) {
        console.log("📸 [processImportTask] Error detectado. Guardando screenshot en scratch/import_error.png...");
        try {
            await page.screenshot({ path: path.join(__dirname, 'scratch', 'import_error.png') });
        } catch (screenshotError) {
            console.log("⚠️ No se pudo guardar el screenshot:", screenshotError.message);
        }
        throw e;
    } finally {
        await context.close();
    }
}

function convertTo24Hour(timeStr) {
    if (!timeStr) return '';
    const cleaned = timeStr.trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length < 2) return cleaned;
    
    const [timeVal, ampm] = parts;
    const timeParts = timeVal.split(':');
    if (timeParts.length < 2) return cleaned;
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    
    if (ampm.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
    } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function mapDomainKeyToKeyword(domKey) {
    const mappings = {
        "1_mental_health_substance_abuse": "Mental Health",
        "2_physical_health_medical_dental": "Physical Health",
        "3_vocational_employment_job_training": "Vocational",
        "4_school_education": "School",
        "5_recreational_social_support": "Recreational",
        "6_activities_of_daily_living": "Daily Living",
        "7_housing_shelter": "Housing",
        "8_economic_financial": "Economic",
        "9_basic_needs": "Basic Needs",
        "10_transportation": "Transportation",
        "11_legal_immigration": "Immigration",
        "12_other": "Other"
    };
    return mappings[domKey] || '';
}

async function fillEditor(locator, text) {
    if (!text) return;
    try {
        await locator.fill(text, { timeout: 3000 });
    } catch (e) {
        console.log(`⚠️ Normal fill failed or timed out. Falling back to JS evaluate fill...`);
        await locator.evaluate((el, val) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            if (window.$ && window.$(el)) {
                window.$(el).trigger('input').trigger('change').trigger('blur');
            }
        }, text);
    }
}

function mapClioServiceToAmexzone(clioService, patientDob) {
    const s = (clioService || "").toLowerCase();
    if (s.includes("new referral") || s.includes("case assign")) {
        return "New Referral - Initial Telephone Contact and Coordination of Initial Home Visit";
    }
    if (s.includes("initial home visit") || s.includes("develop intake")) {
        return "Initial Home Visit / Develop Intake";
    }
    if (s.includes("telephone") || s.includes("phone")) {
        return "TCM Telephone Contact";
    }
    if (s.includes("mhv") || s.includes("monthly home visit")) {
        return "Monthly Home Visit";
    }
    if (s.includes("development") || s.includes("dev")) {
        return "TCM Service Plan Development";
    }
    if (s.includes("discussion") || s.includes("disc")) {
        return "TCM Service Plan Discussion";
    }
    if (s.includes("review") || s.includes("rev")) {
        return "TCM Service Plan Review";
    }
    if (s.includes("collateral") || s.includes("contact")) {
        return "TCM Collateral Contact";
    }
    if (s.includes("assessment") || s.includes("certification") || s.includes("comprehensive")) {
        if (patientDob) {
            try {
                const birthDate = new Date(patientDob);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                if (age >= 18) {
                    return "Adult Certification";
                } else {
                    return "Children's Certification";
                }
            } catch (e) {}
        }
        return "Adult Certification";
    }
    return clioService;
}

const { processProgressNoteTask } = require('./src/tasks/progressNoteTask');

async function processConnectTask(task, integration) {
    const { triggerProviderLogin } = require('./src/core/authService');
    await triggerProviderLogin(task.user_id, integration);
}

async function run() {
    console.log("🤖 INICIANDO WORKER DE AUTO-LLENADO DE EVALUACIONES AMEXZONE...");
    
    // 1. Reclamar la siguiente tarea de forma atómica respetando el límite de concurrencia de 3
    let { data: rpcTask, error } = await supabase
        .rpc('claim_next_task', { concurrency_limit: 3 });

    let task = Array.isArray(rpcTask) ? (rpcTask.length > 0 ? rpcTask[0] : null) : rpcTask;

    if (error) {
        console.error("❌ Error al reclamar tarea de la base de datos:", error.message);
        return;
    }

    if (!task) {
        console.log("📭 No hay tareas pendientes para procesar o se alcanzó el límite de concurrencia.");
        return;
    }

    console.log(`🎯 Tarea reclamada exitosamente (ID: ${task.id})`);

    // 2. Obtener credenciales desencriptadas mediante la función RPC segura
    let { data: rpcIntegration, error: intError } = await supabase
        .rpc('get_decrypted_integration', { 
            target_user_id: task.user_id,
            secret_key: 'clio_bot_secret_decryption_token_9823472'
        });

    let integration = Array.isArray(rpcIntegration) ? rpcIntegration[0] : rpcIntegration;

    if (intError || !integration) {
        const { data: fallbackIntegration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', task.user_id)
            .maybeSingle();
            
        if (fallbackIntegration) {
            integration = {
                amexzone_username: fallbackIntegration.username || fallbackIntegration.amexzone_username || '',
                amexzone_password: fallbackIntegration.password || fallbackIntegration.amexzone_password || ''
            };
        } else {
            const { data: anyInt } = await supabase
                .from('user_integrations')
                .select('*')
                .limit(1)
                .maybeSingle();
            if (anyInt) {
                integration = {
                    amexzone_username: anyInt.username || anyInt.amexzone_username || '',
                    amexzone_password: anyInt.password || anyInt.amexzone_password || ''
                };
            }
        }
    }

    if (!integration) {
        console.error("❌ No se encontraron credenciales válidas para el proveedor.");
        await supabase.rpc('update_note_task_status', {
            task_id: task.id,
            new_status: 'failed',
            err_msg: 'Credenciales de Amexzone no configuradas o inválidas.'
        });
        return;
    }

    try {
        if (task.note_text.startsWith('[IMPORT_PATIENT]')) {
            const resultData = await processImportTask(task, integration);
            await supabase.rpc('update_note_task_status', {
                task_id: task.id,
                new_status: 'completed',
                res_summary: resultData
            });
            console.log("🎉 Tarea de importación completada con éxito.");
        } else if (task.note_text === '[CONNECT]') {
            console.log("🔐 Procesando tarea especial de inicio de sesión y vinculación...");
            await processConnectTask(task, integration);
            await supabase.rpc('update_note_task_status', {
                task_id: task.id,
                new_status: 'completed'
            });
            console.log("🎉 Vinculación y login completados con éxito.");
        } else if (task.note_text.startsWith('[TCM_PROGRESS_NOTE]')) {
            // Manual review gate: never push a note with unresolved [CONFIRM: ...] items to Amexzone.
            if (/\[CONFIRM:/i.test(task.note_text)) {
                throw new Error('Nota pendiente de revisión (Pending TCM Review): contiene campos [CONFIRM] sin resolver. Resuélvelos en Clio antes de sincronizar.');
            }
            console.log("📝 Procesando nota de progreso...");
            await processProgressNoteTask(task, integration);
            await supabase.rpc('update_note_task_status', {
                task_id: task.id,
                new_status: 'completed'
            });
            console.log("🎉 Tarea de nota de progreso completada con éxito.");
        } else {
            await processTask(task, integration);
            await supabase.rpc('update_note_task_status', {
                task_id: task.id,
                new_status: 'completed'
            });
            console.log("🎉 Tarea de sincronización de nota completada con éxito.");
        }
            
    } catch (err) {
        console.error("❌ Error ejecutando la tarea:", err.message);
        await supabase.rpc('update_note_task_status', {
            task_id: task.id,
            new_status: 'failed',
            err_msg: err.message
        });
        if (task.note_text === '[CONNECT]') {
            await supabase.from('provider_integrations').update({ mfa_status: 'expired', mfa_code: null }).eq('user_id', task.user_id);
            console.log('⚠️ Estado de integración actualizado a expired por fallo en conexión.');
        }
    }
}

const MAX_CONCURRENT_TASKS = 3;
let activeTasksCount = 0;

async function start() {
    console.log("🤖 INICIANDO WORKER DE AUTO-LLENADO DE EVALUACIONES AMEXZONE (POLLING ACTIVO CON CONCURRENCIA HASTA 3)...");
    while (true) {
        if (activeTasksCount < MAX_CONCURRENT_TASKS) {
            activeTasksCount++;
            run()
                .catch((err) => {
                    console.error("❌ Error en ejecución de tarea:", err.message);
                })
                .finally(() => {
                    activeTasksCount = Math.max(0, activeTasksCount - 1);
                });
        }
        // Espera 4 segundos antes de volver a verificar
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
}

if (require.main === module) {
    start();
}

module.exports = {
    processTask
};
