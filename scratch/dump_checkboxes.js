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

    // Test specific checkbox selector
    const selector = '#preview_response_option_7_78_85_68';
    console.log(`Checking selector: ${selector}`);
    
    const countTop = await page.locator(selector).count();
    console.log(`Count in top page: ${countTop}`);
    if (countTop > 0) {
        console.log(`Visible in top page: ${await page.locator(selector).first().isVisible()}`);
    }

    const frame = page.frameLocator('iframe[name="utils_iframe"]');
    const countFrame = await frame.locator(selector).count();
    console.log(`Count in utils_iframe: ${countFrame}`);
    if (countFrame > 0) {
        console.log(`Visible in utils_iframe: ${await frame.locator(selector).first().isVisible()}`);
    }

    // Print all frame names
    const frames = page.frames();
    console.log(`Total frames on page: ${frames.length}`);
    frames.forEach((f, i) => {
        console.log(`Frame ${i}: Name="${f.name()}" URL="${f.url()}"`);
    });

    await context.close();
}

main().catch(console.error);
