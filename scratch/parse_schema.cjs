const fs = require('fs');

const content = fs.readFileSync('scratch/prompt_autofill_assessment.txt', 'utf8');

const startMarker = 'Return ONLY a JSON object matching this exact schema:';
const endMarker = 'Return JSON only.';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const jsonBlock = content.slice(startIdx + startMarker.length, endIdx).trim();

try {
    const parsed = JSON.parse(jsonBlock);
    console.log("Success! The prompt's JSON schema example is valid JSON.");
    console.log("Keys count:", Object.keys(parsed).length);
} catch (e) {
    console.error("Failed to parse JSON schema block:", e.message);
    
    // Find the error location
    const pos = e.message.match(/at position (\d+)/);
    if (pos) {
        const charPos = parseInt(pos[1]);
        const context = jsonBlock.slice(Math.max(0, charPos - 50), Math.min(jsonBlock.length, charPos + 50));
        console.log("Context around error:");
        console.log(context);
        console.log(" ".repeat(50) + "^");
    }
}
