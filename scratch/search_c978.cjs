const fs = require('fs');
const readline = require('readline');

async function searchC978() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/c9785a6c-54ee-4694-bc50-93e8f4f2213d/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (line.includes('Compact Recorded Services Capsule Ribbon') || line.includes('max-w-2xl xl:max-w-3xl')) {
            console.log(`Match in c978 at line ${lineNum}`);
            try {
                const parsed = JSON.parse(line);
                fs.writeFileSync(`scratch/c978_line_${lineNum}.json`, JSON.stringify(parsed, null, 2));
            } catch (e) {}
        }
    }
}

searchC978();
