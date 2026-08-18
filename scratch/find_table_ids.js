const { chromium } = require('playwright');

async function main() {
    const patientEmrId = '27510';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;
    
    console.log("Launching browser with persistent context at:", userDataDir);
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    const formUrl = `https://www.amexzone.com/iframe/patient/documentation/fill/106/${patientEmrId}/assessment`;
    console.log("Navigating to:", formUrl);
    await page.goto(formUrl, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(6000);

    const questionsInfo = await page.evaluate(() => {
        let root = null;
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
        }

        if (!root) return "Vue root not found";

        const results = [];
        root.document.data.secciones.forEach(sec => {
            if (sec.segmentos) {
                sec.segmentos.forEach(seg => {
                    if (seg.preguntas) {
                        seg.preguntas.forEach(q => {
                            if (q.table_cols || q.allow_rows || q.tipo === 'table') {
                                results.push({
                                    id: q.id,
                                    label: q.label || q.nombre,
                                    tipo: q.tipo,
                                    cols: q.table_cols ? q.table_cols.map(c => c.name || c.label) : []
                                });
                            }
                        });
                    }
                });
            }
        });
        return results;
    });

    console.log("Found Tables inside Vue root:");
    console.log(JSON.stringify(questionsInfo, null, 2));

    await context.close();
}

main().catch(console.error);
