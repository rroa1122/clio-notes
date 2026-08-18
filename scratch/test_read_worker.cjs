const fs = require('fs');
const path = 'C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\worker.js';
if (fs.existsSync(path)) {
    console.log("File exists!");
    const content = fs.readFileSync(path, 'utf8');
    console.log(content.slice(0, 1000));
} else {
    console.log("File does not exist!");
}
