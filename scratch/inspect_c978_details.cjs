const fs = require('fs');

const editFiles = [
    'scratch/c978_edit_694.json',
    'scratch/c978_edit_698.json',
    'scratch/c978_edit_702.json',
    'scratch/c978_edit_720.json',
    'scratch/c978_edit_737.json',
    'scratch/c978_edit_743.json',
    'scratch/c978_edit_761.json',
    'scratch/c978_edit_765.json',
];

for (const f of editFiles) {
    if (fs.existsSync(f)) {
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        console.log(`=== ${f}: ${d.args?.Description} ===`);
        if (d.args?.TargetContent) {
            console.log('Target:', d.args.TargetContent.substring(0, 150));
            console.log('Replacement:', d.args.ReplacementContent.substring(0, 150));
        }
    }
}
