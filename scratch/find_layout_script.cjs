const fs = require('fs');
const readline = require('readline');

async function findLayoutScript() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (line.includes('scratch/') && line.includes('.cjs') && (line.includes('compact') || line.includes('responsive') || line.includes('fit') || line.includes('refactor') || line.includes('screen'))) {
            console.log(`Line ${lineNum} mentions script`);
            try {
                const parsed = JSON.parse(line);
                fs.writeFileSync(`scratch/script_found_${lineNum}.json`, JSON.stringify(parsed, null, 2));
            } catch (e) {}
        }
    }
}

findLayoutScript();
