const fs = require('fs');
const readline = require('readline');

async function extractFromC978() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/c9785a6c-54ee-4694-bc50-93e8f4f2213d/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    let recordVersions = [];
    for await (const line of rl) {
        lineNum++;
        if (line.includes('write_to_file') && line.includes('Record.tsx')) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.tool_calls) {
                    for (const tc of parsed.tool_calls) {
                        const args = tc.args || tc.parameters;
                        if (args?.CodeContent && args?.TargetFile?.includes('Record.tsx')) {
                            console.log(`Found Record.tsx in c978 at line ${lineNum} (len: ${args.CodeContent.length})`);
                            fs.writeFileSync(`scratch/record_c978_${lineNum}.tsx`, args.CodeContent, 'utf8');
                            recordVersions.push(`scratch/record_c978_${lineNum}.tsx`);
                        }
                    }
                }
            } catch (e) {}
        }
    }
    console.log(`Saved versions:`, recordVersions);
}

extractFromC978();
