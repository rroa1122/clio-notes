const fs = require('fs');
const envText = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\.env', 'utf8');

console.log("Env keys:");
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 1 && parts[0].trim()) {
        console.log(`- ${parts[0].trim()}`);
    }
});
