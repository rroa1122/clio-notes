const path = require('path');
const { launchBrowserContext, setupPageInterceptors, waitForLoader } = require('/root/amexzone-notes-bot/src/core/browser');

async function main() {
    process.env.DISPLAY = ':99';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = path.join('/root/amexzone-notes-bot', 'user_data_provider_' + userId);
    
    const context = await launchBrowserContext(userDataDir, { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }, userId);
    const page = context.pages()[0] || await context.newPage();
    await setupPageInterceptors(page);

    console.log('🌐 Navegando al perfil del paciente para eliminar cita 1584829...');
    await page.goto('https://www.amexzone.com/patient/27510&v=2', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const pinInput = page.locator('#access_code');
    if (await pinInput.isVisible().catch(() => false)) {
        await pinInput.fill('1974');
        const enterBtn = page.locator('#entrar_access_code_btn');
        if (await enterBtn.isVisible()) await enterBtn.click();
        await page.waitForTimeout(2000);
    }

    // Go to Citas tab
    const citasTab = page.locator('a:has-text("Citas"), a:has-text("Appointments")').first();
    if (await citasTab.isVisible()) await citasTab.click();
    await page.waitForTimeout(2000);

    // Find delete action for cita 1584829
    const deleteInfo = await page.evaluate(() => {
        const cita1584829 = document.querySelector('tr[data-id="1584829"], tr:has(a[href*="1584829"]), tr:has-text("1584829"), [data-cita-id="1584829"]');
        return {
            hasCitaRow: !!cita1584829,
            windowFunctions: Object.keys(window).filter(k => /eliminar|delete|cancelar/i.test(k))
        };
    });

    console.log('DELETE INFO:', JSON.stringify(deleteInfo, null, 2));

    // Try deleting via JS function or clicking delete button
    await page.evaluate(() => {
        if (typeof window.eliminarCita === 'function') window.eliminarCita(1584829);
        else if (typeof window.deleteCita === 'function') window.deleteCita(1584829);
        else if (typeof window.cancelarCita === 'function') window.cancelarCita(1584829);
        else {
            const btn = document.querySelector('a[onclick*="1584829"][onclick*="eliminar"], a[onclick*="1584829"][onclick*="delete"], button[onclick*="1584829"]');
            if (btn) btn.click();
        }
    });

    await page.waitForTimeout(2000);

    // Confirm deletion if dialog appears
    const confirmBtn = page.locator('button:has-text("Yes, delete"), button:has-text("Sí, eliminar"), button:has-text("OK"), .swal2-confirm').first();
    if (await confirmBtn.isVisible().catch(() => false)) {
        console.log('👆 Confirmando eliminación en el diálogo...');
        await confirmBtn.click();
        await page.waitForTimeout(3000);
    }

    console.log('✅ Eliminación intentada.');
    await context.close();
}

main().catch(console.error);
