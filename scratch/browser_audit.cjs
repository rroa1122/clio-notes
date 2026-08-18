const { chromium } = require('playwright');
const fs = require('fs');

async function runAudit() {
    console.log('🚀 Launching Chromium browser audit on https://notes.clinicflow.dev ...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    
    const page = await context.newPage();
    
    const consoleLogs = [];
    const pageErrors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        }
    });
    
    page.on('pageerror', err => {
        pageErrors.push(err.message);
    });

    const report = {
        screens: {},
        consoleLogs,
        pageErrors,
        timings: {},
        findings: []
    };

    try {
        // 1. Visit Dictate / Record Page
        console.log('[1/4] Auditing Dictate / Record Page...');
        const t0 = Date.now();
        await page.goto('https://notes.clinicflow.dev/notes/new', { waitUntil: 'networkidle', timeout: 20000 });
        report.timings.recordLoadMs = Date.now() - t0;
        
        await page.screenshot({ path: 'scratch/browser_record_desktop.png', fullPage: false });
        console.log('  📸 Screenshot captured: scratch/browser_record_desktop.png');

        // Test responsive viewports
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'scratch/browser_record_laptop.png' });

        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'scratch/browser_record_mobile.png' });

        // Reset to desktop
        await page.setViewportSize({ width: 1440, height: 900 });

        // 2. Visit History / Agenda Page
        console.log('[2/4] Auditing Clinical History / Agenda Page...');
        const t1 = Date.now();
        await page.goto('https://notes.clinicflow.dev/notes/history', { waitUntil: 'networkidle', timeout: 20000 });
        report.timings.historyLoadMs = Date.now() - t1;
        await page.screenshot({ path: 'scratch/browser_history_desktop.png' });

        // 3. Visit Templates Page
        console.log('[3/4] Auditing Templates Page...');
        const t2 = Date.now();
        await page.goto('https://notes.clinicflow.dev/notes/templates', { waitUntil: 'networkidle', timeout: 20000 });
        report.timings.templatesLoadMs = Date.now() - t2;
        await page.screenshot({ path: 'scratch/browser_templates_desktop.png' });

        // 4. Visit Sync Portal
        console.log('[4/4] Auditing Sync Portal Page...');
        const t3 = Date.now();
        await page.goto('https://notes.clinicflow.dev/sync', { waitUntil: 'networkidle', timeout: 20000 });
        report.timings.syncLoadMs = Date.now() - t3;
        await page.screenshot({ path: 'scratch/browser_sync_desktop.png' });

        console.log('✅ Audit completed successfully!');
    } catch (err) {
        console.error('Audit encountered error:', err.message);
        report.findings.push(`Navigation error: ${err.message}`);
    } finally {
        await browser.close();
    }

    fs.writeFileSync('scratch/browser_audit_results.json', JSON.stringify(report, null, 2));
    console.log('📊 Audit results saved to scratch/browser_audit_results.json');
}

runAudit().catch(console.error);
