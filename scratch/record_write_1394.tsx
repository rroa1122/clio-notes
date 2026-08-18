const fs = require('fs');
const readline = require('readline');

async function findInTranscript() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lastRecordCode = null;
    let count = 0;
    for await (const line of rl) {
        if (line.includes('Compact Recorded Services Capsule Ribbon') || (line.includes('Record.tsx') && line.includes('max-w-2xl xl:max-w-3xl'))) {
            count++;
            console.log(`Found match ${count}`);
            try {
                const parsed = JSON.parse(line);
                fs.writeFileSync(`scratch/transcript_match_${count}.json`, JSON.stringify(parsed, null, 2));
            } catch (e) {}
        }
    }
    console.log(`Total matches: ${count}`);
}

findInTranscript();
