const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\02de1bcb-e76c-4ad1-95e1-d1f3d5f89af6\\.system_generated\\tasks\\task-3340.log', 'utf8');

const lines = content.split('\n');
console.log("Printing detailed worker logs for Testthiago Six sync L1450-1530:");
for (let i = 1450; i < 1530; i++) {
    if (lines[i]) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
