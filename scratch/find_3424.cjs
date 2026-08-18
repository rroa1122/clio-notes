const fs = require('fs');
const readline = require('readline');

async function findRecord3424() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (lineNum >= 1100 && lineNum <= 1320) {
            if (line.includes('write_to_file') || line.includes('replace_file_content') || line.includes('.cjs')) {
                console.log(`Line ${lineNum}: ${line.substring(0, 150)}`);
                try {
                    const p = JSON.parse(line);
                    fs.writeFileSync(`scratch/step_${lineNum}.json`, JSON.stringify(p, null, 2));
                } catch (e) {}
            }
        }
    }
}

findRecord3424();
