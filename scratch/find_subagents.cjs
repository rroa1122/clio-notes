const fs = require('fs');
const readline = require('readline');

async function findSubagents() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (line.includes('invoke_subagent') || line.includes('layout_responsive_specialist')) {
            console.log(`Line ${lineNum} mentions subagent`);
            try {
                const parsed = JSON.parse(line);
                fs.writeFileSync(`scratch/subagent_line_${lineNum}.json`, JSON.stringify(parsed, null, 2));
            } catch (e) {}
        }
    }
}

findSubagents();
