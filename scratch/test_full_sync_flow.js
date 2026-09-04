const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');
const { createNewAppointment } = require('/root/amexzone-notes-bot/src/amexzone/appointmentService');
const { processEncounterServices } = require('/root/amexzone-notes-bot/src/amexzone/encounterService');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    const testPayload = {
        patient_name: 'Testthiago Six',
        patient_emr_id: 'AMH4208',
        visit_date: '2026-08-01',
        time_in: '10:00 AM',
        time_out: '11:00 AM',
        duration: '60',
        pos: '12 - Home',
        service_type: 'Transportation Coordination for Depressed Client to Preserve Treatment Access',
        narrative: {
            assessment: 'Block Title: Appt Coord Place of Service: 12 - Home Time range: 10:00 AM-11:00 AM Duration: 60 min Codes: T1017 Units: 4 The Targeted Case Manager coordinated transportation support for the client in response to functional barriers associated with recurrent major depressive disorder and generalized anxiety, which impair her ability to independently organize transportation and manage appointment-related tasks under stress.',
            outcome_of_services: 'Transportation was successfully coordinated for the client to attend upcoming behavioral health appointments without disruptions.',
            next_steps: '- TCM will: Follow up on transportation confirmation with logistics provider.\n- TCM will: Confirm client attendance at next psychiatric check-in.'
        },
        domains: ['1_mental_health_substance_abuse']
    };

    console.log('🌐 Navegando al perfil del paciente 27510...');
    await page.goto('https://www.amexzone.com/patient/27510&v=2', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    console.log('🚀 1. Creando cita inicial con 10:00 AM (debe detectar superposición)...');
    try {
        await createNewAppointment(page, testPayload);
        await processEncounterServices(page, testPayload, '1974');
    } catch (err) {
        console.log('⚠️ Error de superposición capturado correctamente:', err.message);
        
        let newStart = '12:45 PM';
        let newEnd = '01:45 PM';
        const match = err.message.match(/SUGGESTED_TIME:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (match) {
            newStart = match[1];
        }

        console.log(`\n🔄 2. Reintentando con nuevo horario libre: ${newStart} a ${newEnd}...`);
        testPayload.time_in = newStart;
        testPayload.time_out = newEnd;

        // Re-attempt creating or managing appointment with new time
        await createNewAppointment(page, testPayload);
        await processEncounterServices(page, testPayload, '1974');
        console.log('🎉 Reintento completado con éxito!');
    }

    await context.close();
}

main().catch(console.error);
