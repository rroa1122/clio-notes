const fs = require('fs');
const readline = require('readline');

async function findFullRecord() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lastCandidate = null;
    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (line.includes('Total Lines: 3424') || (line.includes('export default Record;') && line.includes('Total Bytes: 253627'))) {
            console.log(`Line ${lineNum} has Record info`);
        }
        if (line.includes('"TargetFile":"c:/Users/REINIER/.gemini/antigravity/scratch/clio-dashboard/src/notes-module/pages/Record.tsx"') ||
            line.includes('"TargetFile":"c:\\\\Users\\\\REINIER\\\\.gemini\\\\antigravity\\\\scratch\\\\clio-dashboard\\\\src\\\\notes-module\\\\pages\\\\Record.tsx"')) {
            console.log(`Edit at line ${lineNum}`);
        }
    }
}

findFullRecord();
