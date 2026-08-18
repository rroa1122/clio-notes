const fs = require('fs');
const readline = require('readline');

async function extractViewsAround1098() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (lineNum >= 1050 && lineNum <= 1120) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'VIEW_FILE') {
                    console.log(`View at line ${lineNum}:`, parsed.content.substring(0, 100));
                }
            } catch (e) {}
        }
    }
}

extractViewsAround1098();
