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

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    const fields = await page.evaluate(() => {
        const textareas = Array.from(document.querySelectorAll('textarea')).map(t => ({
            id: t.id,
            name: t.name,
            placeholder: t.placeholder,
            value: t.value,
            parentText: t.parentElement?.innerText?.slice(0, 80)
        }));

        const quillEditors = Array.from(document.querySelectorAll('.ql-editor')).map(q => ({
            className: q.className,
            text: q.innerText?.slice(0, 80),
            parentText: q.closest('.form-group, div')?.innerText?.slice(0, 80)
        }));

        const vm = (document.querySelector('#site') || document.querySelector('#app') || document.querySelector('.main-content'))?.__vue__ || window.vuem;
        const citaKey = Object.keys(vm?.citas || {})[0];
        const cita = vm?.citas?.[citaKey];
        const tarea = cita?.tareas?.[0];

        return {
            textareas,
            quillEditors,
            cita_outcome: cita?.tcm_outcome_of_services,
            cita_next_steps: cita?.tcm_next_steps,
            tarea_outcome: tarea?.tcm_outcome_of_services,
            tarea_next_steps: tarea?.tcm_next_steps,
            cuestionario_respuestas: tarea?.cuestionario_respuestas
        };
    });

    console.log('ENCOUNTER FIELDS IN DOM AND VUE:\n', JSON.stringify(fields, null, 2));
    await context.close();
}

main().catch(console.error);
