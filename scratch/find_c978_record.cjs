const fs = require('fs');
const readline = require('readline');

async function extractFromEndC978() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/c9785a6c-54ee-4694-bc50-93e8f4f2213d/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    let allViews = [];
    for await (const line of rl) {
        lineNum++;
        if (line.includes('export default Record;') && line.includes('File Path: `file:///c:/Users/REINIER/.gemini/antigravity/scratch/clio-dashboard/src/notes-module/pages/Record.tsx`')) {
            console.log(`Found full/partial Record view at line ${lineNum}`);
            allViews.push(lineNum);
        }
    }
    console.log('All view lines:', allViews);
}

extractFromEndC978();
