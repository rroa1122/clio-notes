const http = require('http');
const fs = require('fs');
const path = require('path');

const sealPath = path.join(__dirname, 'assets', 'bobablastic-seal.png');
let sealBase64 = '';
if (fs.existsSync(sealPath)) {
  sealBase64 = 'data:image/png;base64,' + fs.readFileSync(sealPath).toString('base64');
}

function generateStripHtml(activeStamps = 1, totalStamps = 8) {
  let stampsHtml = '';
  for (let i = 1; i <= totalStamps; i++) {
    const isActive = i <= activeStamps;
    const isLast = i === totalStamps;
    stampsHtml += `
      <div class="stamp-slot">
        <div class="stamp ${isActive ? 'active' : 'locked'}">
          <img src="${sealBase64}" />
          ${isLast ? '<span class="gift-badge">🎁</span>' : ''}
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1032px;
    height: 336px;
    background: #e11d48;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%),
                linear-gradient(160deg, #ff1e46 0%, #e11d48 40%, #be123c 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 36px;
    position: relative;
    overflow: hidden;
  }
  .brand-col {
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 2;
    flex-shrink: 0;
  }
  .logo-box {
    width: 96px;
    height: 96px;
    background: #ffffff;
    border-radius: 24px;
    padding: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .brand-info h1 {
    font-size: 36px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-shadow: 0 3px 8px rgba(0,0,0,0.3);
    line-height: 1.1;
  }
  .brand-info p {
    font-size: 19px;
    font-weight: 800;
    color: rgba(255,255,255,0.95);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .stamps-grid {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    z-index: 2;
    flex: 1;
    max-width: 620px;
  }
  .stamp-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .stamp {
    width: 66px;
    height: 66px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .stamp.active {
    background: #ffffff;
    box-shadow: 0 8px 20px rgba(0,0,0,0.4), 0 0 12px rgba(255,255,255,0.5);
    border: 3px solid #ffffff;
    transform: scale(1.05);
  }
  .stamp.active img {
    width: 58px;
    height: 58px;
    border-radius: 50%;
  }
  .stamp.locked {
    background: rgba(0,0,0,0.35);
    border: 2.5px dashed rgba(255,255,255,0.6);
    box-shadow: inset 0 3px 8px rgba(0,0,0,0.4);
    transform: scale(0.92);
  }
  .stamp.locked img {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    filter: brightness(0) opacity(0.3);
  }
  .gift-badge {
    position: absolute;
    top: -7px;
    right: -7px;
    font-size: 20px;
    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));
  }
</style>
</head>
<body>
  <div class="brand-col">
    <div class="logo-box">
      <img src="${sealBase64}" />
    </div>
    <div class="brand-info">
      <h1>BOBABLASTIC</h1>
      <p>VIP &bull; ${activeStamps} / ${totalStamps} PERLAS</p>
    </div>
  </div>
  <div class="stamps-grid">
    ${stampsHtml}
  </div>
</body>
</html>`;
}

function renderViaGotenberg(html, width = 1032, height = 336) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const postDataStart = Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="files"; filename="index.html"\r\n' +
      'Content-Type: text/html\r\n\r\n'
    );
    const htmlBuf = Buffer.from(html, 'utf8');
    const postDataEnd = Buffer.from(
      '\r\n--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="width"\r\n\r\n' + width + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="height"\r\n\r\n' + height + '\r\n' +
      '--' + boundary + '--\r\n'
    );

    const fullBody = Buffer.concat([postDataStart, htmlBuf, postDataEnd]);

    const req = http.request('http://127.0.0.1:3000/forms/chromium/screenshot/html', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': fullBody.length
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error('Gotenberg failed: ' + res.statusCode));
        }
      });
    });
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('Regenerando franjas oficiales 1032x336 en fila horizontal...');
  for (let i = 0; i <= 8; i++) {
    const html = generateStripHtml(i, 8);
    const png = await renderViaGotenberg(html, 1032, 336);
    const outPath = path.join(assetsDir, `strip-stamps-${i}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`✅ strip-stamps-${i}.png generado (${png.length} bytes)`);
  }
  console.log('¡Franjas regeneradas!');
}

main().catch(console.error);
