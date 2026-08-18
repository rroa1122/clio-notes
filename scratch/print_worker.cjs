const fs = require('fs');
const path = 'C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\02de1bcb-e76c-4ad1-95e1-d1f3d5f89af6\\scratch\\worker.js';
if (fs.existsSync(path)) {
    console.log("File exists! Content:");
    console.log(fs.readFileSync(path, 'utf8'));
} else {
    console.log("File does not exist at " + path);
    // Let's check other folders
    const files = fs.readdirSync('C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\02de1bcb-e76c-4ad1-95e1-d1f3d5f89af6');
    console.log("Brain folder files:", files);
}
