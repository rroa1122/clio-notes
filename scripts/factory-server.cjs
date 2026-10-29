#!/usr/bin/env node
/**
 * Clio Notes — AI Software Factory Server (Mission Control)
 * Runs on http://localhost:4100
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 4100;
const ROOT_DIR = path.resolve(__dirname, '..');
const ORDERS_FILE = path.join(ROOT_DIR, 'factory', 'orders.json');
const UI_FILE = path.join(__dirname, 'factory-ui.html');

function ensureOrdersFile() {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf8');
}

function readOrders() {
  ensureOrdersFile();
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  ensureOrdersFile();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function runCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: ROOT_DIR, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error ? error.code : 0,
        output: [stdout, stderr].filter(Boolean).join('\n').trim(),
      });
    });
  });
}

async function getGitState() {
  const branchRes = await runCmd('git rev-parse --abbrev-ref HEAD');
  const statusRes = await runCmd('git status -s');
  const countsRes = await runCmd('git rev-list --left-right --count origin/main...HEAD');
  let behind = 0;
  let ahead = 0;
  if (countsRes.ok && countsRes.output) {
    const parts = countsRes.output.trim().split(/\s+/);
    behind = Number(parts[0] || 0);
    ahead = Number(parts[1] || 0);
  }
  const modifiedLines = statusRes.output
    ? statusRes.output.split('\n').filter((l) => l.trim().length > 0)
    : [];

  return {
    branch: branchRes.output || 'main',
    ahead,
    behind,
    modifiedCount: modifiedLines.length,
    modifiedFiles: modifiedLines,
  };
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const html = fs.readFileSync(UI_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/state') {
    const git = await getGitState();
    const orders = readOrders();
    sendJson(res, 200, { git, orders });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const body = await parseBody(req);
    const orders = readOrders();
    const nextNum = 101 + orders.length;
    const newOrder = {
      id: `ORD-${nextNum}`,
      title: body.title || 'Nueva Orden',
      description: body.description || '',
      author: body.author || 'Reinier',
      layers: Array.isArray(body.layers) && body.layers.length ? body.layers : ['Web'],
      stage: body.stage || 'plan',
      qaPassed: false,
      deployed: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      agentNotes: body.agentNotes || 'Esperando análisis del Agente Arquitecto.',
    };
    orders.unshift(newOrder);
    writeOrders(orders);
    sendJson(res, 201, { ok: true, order: newOrder, orders });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/orders/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/orders/', ''));
    const body = await parseBody(req);
    const orders = readOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) {
      sendJson(res, 404, { ok: false, error: 'Orden no encontrada' });
      return;
    }
    orders[idx] = { ...orders[idx], ...body };
    writeOrders(orders);
    sendJson(res, 200, { ok: true, order: orders[idx], orders });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/orders/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/orders/', ''));
    const orders = readOrders().filter((o) => o.id !== id);
    writeOrders(orders);
    sendJson(res, 200, { ok: true, orders });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run-qa') {
    const body = await parseBody(req);
    const result = await runCmd('npm run build');
    if (body.orderId) {
      const orders = readOrders();
      const idx = orders.findIndex((o) => o.id === body.orderId);
      if (idx !== -1) {
        orders[idx].qaPassed = result.ok;
        orders[idx].stage = result.ok ? 'done' : 'build';
        orders[idx].agentNotes = result.ok
          ? '✓ Inspector QA: Compilación exitosa (0 errores TypeScript/Vite).'
          : '✗ Inspector QA detectó errores de compilación. Devuelto a Construcción.';
        writeOrders(orders);
      }
    }
    sendJson(res, 200, { ...result, orders: readOrders() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/flow') {
    const body = await parseBody(req);
    const action = body.action || 'status';
    const arg = body.arg || '';
    let cmd = `node scripts/flow.cjs ${action}`;
    if (arg) {
      const safeArg = String(arg).replace(/"/g, '\\"');
      cmd += ` "${safeArg}"`;
    }
    const result = await runCmd(cmd);
    if (action === 'deploy' && result.ok && body.orderId) {
      const orders = readOrders();
      const idx = orders.findIndex((o) => o.id === body.orderId);
      if (idx !== -1) {
        orders[idx].deployed = true;
        orders[idx].agentNotes = `🚀 Desplegado en clinicflow.dev (${arg || 'all'}).`;
        writeOrders(orders);
      }
    }
    const git = await getGitState();
    sendJson(res, 200, { ...result, git, orders: readOrders() });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🏭 Clio Notes — Fábrica de Software IA activa en: ${url}\n`);
  if (process.argv.includes('--open')) {
    const startCmd =
      process.platform === 'win32'
        ? `start "" "${url}"`
        : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(startCmd);
  }
});
