const { handlePin, handleCompanySelection, isLoggedOut, matchPatientName } = require('../core/sessionManager');
const { waitForLoader, safeGoto } = require('../core/browser');

/**
 * Opens the patient's Amexzone chart by its Amexzone id and VERIFIES it is the right person
 * (name and, when known, date of birth) before anything is written.
 *
 * There is no name-search fallback any more: picking a patient from a search list could write
 * a note into another person's chart. If the id is wrong or the identity does not match, the
 * task stops without touching Amexzone.
 *
 * Returns { amexzoneId, name, dob, cmTrabajadorId }.
 */
const navigateToPatient = async (page, amexzoneId, patientName, pin, userId, expectedDob = '') => {
    if (!amexzoneId) {
        throw new Error('El paciente no está vinculado a Amexzone (falta el Amexzone ID). No se creó nada en Amexzone.');
    }

    console.log(`🌐 Abriendo el chart del paciente en Amexzone (ID: ${amexzoneId})...`);
    await safeGoto(page, `https://www.amexzone.com/patient/info?id=${amexzoneId}&v=2`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForLoader(page);
    await handleCompanySelection(page);
    await handlePin(page, pin);
    await waitForLoader(page);

    if (isLoggedOut(page)) {
        throw new Error('Tu sesión de Amexzone no está activa o ha expirado. Por favor ve a Sync Portal para conectar tu sesión de 90 días.');
    }

    const pageTitle = (await page.title().catch(() => '')).toLowerCase();
    if (pageTitle.includes('404') || pageTitle.includes('not found') || pageTitle.includes('no encontrada') || page.url().includes('404')) {
        throw new Error(`El Amexzone ID ${amexzoneId} guardado en Clio no abre ningún paciente (404). Revisa el Amexzone ID en la ficha del paciente. No se creó nada en Amexzone.`);
    }

    // Read the patient record straight from the Amexzone page (Vue data), retrying while it loads.
    let info = null;
    for (let i = 0; i < 15 && !info; i++) {
        info = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('*')).filter((e) => e.__vue__);
            for (const e of els) {
                const p = e.__vue__ && e.__vue__.paciente;
                if (p && p.id) {
                    return {
                        id: String(p.id),
                        name: p.nombre_apellidos || p.name_last || [p.first_name, p.first_last_name, p.second_last_name].filter(Boolean).join(' '),
                        dob: p.birth || '',
                        cmTrabajadorId: p.cm_trabajador_id ? String(p.cm_trabajador_id) : ''
                    };
                }
            }
            return null;
        }).catch(() => null);
        if (!info) await page.waitForTimeout(1000);
    }

    if (!info) {
        const where = await page.evaluate(() => ({
            url: location.href,
            title: document.title,
            text: (document.body && document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
        })).catch(() => ({ url: page.url(), title: '', text: '' }));
        console.log(`⚠️ No se pudo leer el paciente ${amexzoneId}. Página: ${where.url} | ${where.title} | ${where.text}`);
        await page.screenshot({ path: '/root/amexzone-notes-bot/screenshots/patient_read_failed.png' }).catch(() => {});
        throw new Error(`No se pudo leer el paciente de Amexzone (ID ${amexzoneId}) para verificar su identidad. No se creó nada en Amexzone. [Página: ${where.url} | ${where.title} | ${where.text}]`);
    }
    if (info.id !== String(amexzoneId)) {
        throw new Error(`Amexzone abrió otro paciente (ID ${info.id}) en lugar del ${amexzoneId}. Sincronización cancelada.`);
    }
    if (patientName && !matchPatientName(patientName, info.name)) {
        throw new Error(`El paciente de Amexzone (ID ${amexzoneId}) es "${info.name}" y la nota es de "${patientName}". Sincronización cancelada para no escribir en el chart equivocado.`);
    }
    const normDob = (d) => String(d || '').slice(0, 10);
    if (expectedDob && info.dob && normDob(expectedDob) !== normDob(info.dob)) {
        throw new Error(`La fecha de nacimiento no coincide (Clio ${normDob(expectedDob)}, Amexzone ${normDob(info.dob)}) para el ID ${amexzoneId}. Sincronización cancelada.`);
    }

    console.log(`✅ Paciente verificado en Amexzone: ${info.name} (ID ${info.id}${info.dob ? ', DOB ' + info.dob : ''}).`);
    return { amexzoneId: info.id, name: info.name, dob: info.dob, cmTrabajadorId: info.cmTrabajadorId };
};

module.exports = {
    navigateToPatient
};
