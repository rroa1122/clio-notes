import fs from 'fs';

const d = JSON.parse(fs.readFileSync('scratch/execution_35524.json'));

for (const key of Object.keys(d)) {
    const val = d[key];
    if (val && typeof val === 'object') {
        const str = JSON.stringify(val);
        if (str.includes('mimeType') || str.includes('fileExtension')) {
            console.log(`Key ${key} matches binary properties:`, val);
        }
    }
}
