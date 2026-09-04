const path = require('path');
const { launchBrowserContext, setupPageInterceptors } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    await page.goto('https://www.amexzone.com/attend/appointment/1593889', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const fullData = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const cita = vm?.citas?.[citaKey];
        const tarea = cita?.tareas?.[0];
        
        return {
            citaKeys: Object.keys(cita || {}),
            tareaKeys: Object.keys(tarea || {}),
            cita_simple: {
                id: cita?.id,
                tcm_outcome_of_services: cita?.tcm_outcome_of_services,
                tcm_next_steps: cita?.tcm_next_steps,
                observaciones: cita?.observaciones,
                motivo: cita?.motivo
            },
            tarea_simple: {
                id: tarea?.id,
                response_nota_en: tarea?.response_nota_en?.slice(0, 100),
                response_nota_es: tarea?.response_nota_es?.slice(0, 100),
                tcm_outcome_of_services: tarea?.tcm_outcome_of_services,
                tcm_next_steps: tarea?.tcm_next_steps,
                service_plan: tarea?.service_plan,
                next_steps: tarea?.next_steps,
                goals: tarea?.goals
            }
        };
    });

    console.log('FULL DATA ON APPOINTMENT:\n', JSON.stringify(fullData, null, 2));
    await context.close();
}

main().catch(console.error);
