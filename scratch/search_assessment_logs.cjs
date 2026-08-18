const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\02de1bcb-e76c-4ad1-95e1-d1f3d5f89af6\\.system_generated\\tasks\\task-3340.log', 'utf8');

const lines = content.split('\n');
console.log("Searching for docType, Assessment, or sync tasks in worker logs:");
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('assessment') || line.toLowerCase().includes('doctype') || line.toLowerCase().includes('procesando tarea') || line.toLowerCase().includes('tcm_assessment')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
