const fs = require('fs');
const readline = require('readline');

async function findSubagentResults() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineIdx = 0;
    for await (const line of rl) {
        lineIdx++;
        if (line.includes('"role":') || line.includes('"conversationId":') || line.includes('typeName')) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.content && parsed.content.includes('conversationId')) {
                    console.log(`Line ${lineIdx}: ${parsed.content.substring(0, 300)}`);
                }
            } catch (e) {}
        }
    }
}

findSubagentResults();
