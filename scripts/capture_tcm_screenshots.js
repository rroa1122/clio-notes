
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Artifacts directory
const artifactsDir = 'C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\9aefd606-dbe2-40dc-8212-d7b85dac2cd4';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Navigating to notes...');
        await page.goto('http://localhost:5173/notes');

        console.log('Navigating to history...');
        await page.click('a[href="/notes/history"]');

        console.log('Waiting for history list...');
        // Wait for a row to appear. Assuming table rows or list items.
        // Based on previous logs, we clicked "John Doe".
        // I'll wait for text "John Doe" or just the first row.
        await page.waitForSelector('text=John Doe', { timeout: 5000 }).catch(() => console.log('John Doe not found immediately, waiting a bit...'));

        // Click the first row that looks like a note
        console.log('Opening note...');
        // Try to find a row with John Doe
        const row = page.locator('text=John Doe').first();
        await row.click();

        console.log('Waiting for note content...');
        await page.waitForSelector('text=Progress Note', { timeout: 10000 });

        // Give it a moment to fully render
        await page.waitForTimeout(2000);

        // Scroll container
        // The previous subagent used document.getElementById('record-scroll-container')
        const scrollContainerSelector = '#record-scroll-container';

        // Middle Screenshot
        console.log('scrolling to middle...');
        await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) el.scrollTop = 600;
        }, scrollContainerSelector);

        await page.waitForTimeout(1000);
        const middlePath = path.join(artifactsDir, `polished_tcm_middle_${Date.now()}.png`);
        await page.screenshot({ path: middlePath });
        console.log(`Saved middle screenshot: ${middlePath}`);

        // Bottom Screenshot
        console.log('scrolling to bottom...');
        await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) el.scrollTop = 2000; // ample scroll
        }, scrollContainerSelector);

        await page.waitForTimeout(1000);
        const bottomPath = path.join(artifactsDir, `polished_tcm_bottom_${Date.now()}.png`);
        await page.screenshot({ path: bottomPath });
        console.log(`Saved bottom screenshot: ${bottomPath}`);

    } catch (error) {
        console.error('Error capturing screenshots:', error);
    } finally {
        await browser.close();
    }
})();
