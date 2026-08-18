const fs = require('fs');
const readline = require('readline');

async function inspect1100() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (lineNum >= 1100 && lineNum <= 1111) {
            console.log(`=== Line ${lineNum} ===`);
            try {
                const parsed = JSON.parse(line);
                console.log(`type: ${parsed.type}, source: ${parsed.source}`);
                if (parsed.tool_calls) console.log('tool_calls:', JSON.stringify(parsed.tool_calls).substring(0, 300));
                if (parsed.content && parsed.type === 'CHECKPOINT') console.log('CHECKPOINT text:', parsed.content.substring(0, 300));
            } catch (e) {}
        }
    }
}

inspect1100();
