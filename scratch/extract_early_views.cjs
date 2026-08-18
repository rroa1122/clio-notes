const fs = require('fs');
const readline = require('readline');

async function extractEarlyViews() {
    const logPath = 'C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl';
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineIdx = 0;
    for await (const line of rl) {
        lineIdx++;
        if (line.includes('Total Lines:') && line.includes('Record.tsx')) {
            console.log(`Line ${lineIdx}:`);
            const p = JSON.parse(line);
            console.log(p.content.substring(0, 250));
        }
    }
}

extractEarlyViews();
