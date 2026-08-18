const fs = require('fs');
const readline = require('readline');

async function extractRanges() {
    const logPath = 'C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl';
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineIdx = 0;
    for await (const line of rl) {
        lineIdx++;
        if (line.includes('Total Lines: 3424')) {
            try {
                const p = JSON.parse(line);
                if (p.content) {
                    const firstLine = p.content.split('\n')[5] || '';
                    console.log(`Step ${lineIdx}: ${firstLine}`);
                }
            } catch (e) {}
        }
    }
}

extractRanges();
