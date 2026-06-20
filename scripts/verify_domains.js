
const { chromium } = require('playwright');
const path = require('path');

const artifactsDir = 'C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\9aefd606-dbe2-40dc-8212-d7b85dac2cd4';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Navigating to test page...');
        await page.goto('http://localhost:5173/test-tcm');
        await page.waitForTimeout(2000);

        // Capture initial state (read-only by default in standalone?)
        // Wait, TestTCM renders TcmNoteShell with isStandalone=true.
        // TcmNoteShell defaults isEditMode to false.

        console.log('Capturing Initial View Mode...');
        const domainsSection = page.locator('h2:has-text("Clinical Focus")');
        await domainsSection.scrollIntoViewIfNeeded();
        await page.screenshot({
            path: path.join(artifactsDir, `domain_view_mode_${Date.now()}.png`),
            clip: { x: 150, y: 550, width: 900, height: 400 }
        });

        // Toggle Edit Mode
        console.log('Switching to Edit Mode...');
        // TcmNoteShell has an "Edit Note" button near the top in standalone mode?
        // Let's check TcmNoteShell...
        // <button onClick={() => setIsEditMode(!isEditMode)} ...> {isEditMode ? "Done" : "Edit Note"} </button>
        await page.click('text=Edit Note');
        await page.waitForTimeout(500);

        console.log('Capturing Edit Mode (Before Toggle)...');
        await page.screenshot({
            path: path.join(artifactsDir, `domain_edit_mode_before_${Date.now()}.png`),
            clip: { x: 150, y: 550, width: 900, height: 400 }
        });

        // Click a domain to toggle
        console.log('Toggling a domain...');
        // Let's click "#2 Physical Health"
        await page.click('text=#2 Physical Health');
        await page.waitForTimeout(500);

        console.log('Capturing Edit Mode (After Toggle)...');
        await page.screenshot({
            path: path.join(artifactsDir, `domain_edit_mode_toggled_${Date.now()}.png`),
            clip: { x: 150, y: 550, width: 900, height: 400 }
        });

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'error_domain_verify.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
