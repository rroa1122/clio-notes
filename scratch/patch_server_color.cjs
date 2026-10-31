const fs = require('fs');
const filePath = '/var/www/clinicflow-website/vip/push-server/server.js';
let txt = fs.readFileSync(filePath, 'utf8');

txt = txt.replace("backgroundColor: color || '#ff1e46',", "color: color || '#e11d48',\n        backgroundColor: color || '#e11d48',");
txt = txt.replace("logoText: bizName,", "logoText: `${bizName} VIP`,");

fs.writeFileSync(filePath, txt, 'utf8');
console.log('SERVER JS COLOR KEY PATCHED');
