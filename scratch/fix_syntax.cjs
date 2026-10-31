const fs = require('fs');
const filePath = '/var/www/clinicflow-website/vip/push-server/server.js';
let txt = fs.readFileSync(filePath, 'utf8');
txt = txt.replace('f"{stampsNum} / {maxStamps}"', '`${stampsNum} / ${maxStamps}`');
txt = txt.replace("'●'*stampsNum + '○'*max(0, 8 - stampsNum)", "'●'.repeat(stampsNum) + '○'.repeat(Math.max(0, 8 - stampsNum))");
fs.writeFileSync(filePath, txt, 'utf8');
console.log('NODE JS SYNTAX FIXED');
