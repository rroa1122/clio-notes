const fs = require('fs');
const path = require('path');

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fp = path.join(dir, f);
        if (f === 'node_modules' || f === '.git') continue;
        let st = fs.statSync(fp);
        if (st.isDirectory()) {
            search(fp);
        } else if (f === 'worker.js') {
            console.log("Found worker.js:", JSON.stringify(fp));
        }
    }
}
search('C:\\Users\\REINIER\\.gemini\\antigravity');
