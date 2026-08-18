const { chromium } = require('playwright');

async function main() {
    const patientEmrId = '27510';
    const userId = 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const userDataDir = `/root/amexzone-notes-bot/user_data_provider_${userId}`;
    
    console.log("Launching browser...");
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true
    });

    const page = await context.newPage();
    await page.goto(`https://www.amexzone.com/iframe/patient/documentation/fill/106/${patientEmrId}/assessment`);
    await page.waitForTimeout(6000);

    const tag = await page.evaluate(() => {
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

        const results = {};
        const ids = [193, 194, 195, 132];
        root.document.data.secciones.forEach(sec => {
            if (sec.segmentos) {
                sec.segmentos.forEach(seg => {
                    if (seg.preguntas) {
                        seg.preguntas.forEach(q => {
                            if (ids.includes(q.id)) {
                                results[q.id] = {
                                    name_en: q.name_en,
                                    name_es: q.name_es,
                                    type: q.type
                                };
                            }
                        });
                    }
                });
            }
        });
        return results;
    });

    console.log("Element #preview_response_pregunta_194:");
    console.log(JSON.stringify(tag, null, 2));

    await context.close();
}

main().catch(console.error);
