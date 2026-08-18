const fs = require('fs');

for (let i = 1; i <= 5; i++) {
    const data = JSON.parse(fs.readFileSync(`scratch/transcript_match_${i}.json`, 'utf8'));
    console.log(`Match ${i}: content preview:`, (data.content || '').substring(0, 200));
}
