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

    const questions = await page.evaluate(() => {
        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const cita = vm?.citas?.[citaKey];
        const tarea = cita?.tareas?.[0];
        
        return {
            tarea_id: tarea?.id,
            preguntas: (tarea?.cuestionario_respuestas?.preguntas || tarea?.cuestionario?.preguntas || []).map(p => ({
                id: p.id,
                titulo: p.name_en || p.name_es,
                tipo: p.tipo,
                response: p.response,
                opciones: p.opciones?.map(o => ({ id: o.id, text: o.name_en || o.name_es }))
            }))
        };
    });

    console.log('CUESTIONARIO PREGUNTAS:\n', JSON.stringify(questions, null, 2));
    await context.close();
}

main().catch(console.error);
