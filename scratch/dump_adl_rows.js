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

    const rows = await page.evaluate(() => {
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

        let foundQ = null;
        root.document.data.secciones.forEach(sec => {
            if (sec.segmentos) {
                sec.segmentos.forEach(seg => {
                    if (seg.preguntas) {
                        seg.preguntas.forEach(q => {
                            if (q.id === 200) foundQ = q;
                        });
                    }
                });
            }
        });

        return foundQ ? foundQ.table_rows : null;
    });

    console.log("ADL Rows:");
    console.log(JSON.stringify(rows, null, 2));

    await context.close();
}

main().catch(console.error);
