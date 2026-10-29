#!/usr/bin/env node
/**
 * Clio Notes — Team & Agent Workflow CLI (flow.cjs)
 *
 * Interactive menu:
 *   npm run flow
 *
 * Direct subcommands (for AI Agents & Developers):
 *   npm run flow -- status
 *   npm run flow -- sync
 *   npm run flow -- start <branch-name>
 *   npm run flow -- save "<commit-message>"
 *   npm run flow -- deploy [all|web|n8n|bot]
 */

const { execSync } = require('child_process');
const readline = require('readline');

const REPO_URL = 'https://github.com/rroa1122/clio-notes';
const VPS_HOST = 'root@clinicflow.dev';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options,
    });
  } catch (err) {
    if (options.ignoreError) return '';
    throw err;
  }
}

function getBranch() {
  return run('git rev-parse --abbrev-ref HEAD', { silent: true }).trim();
}

function cmdStatus() {
  console.log(`\n${C.cyan}${C.bold}=== Clio Notes: Estado del Proyecto ===${C.reset}`);
  const branch = getBranch();
  console.log(`${C.bold}Rama actual:${C.reset} ${C.green}${branch}${C.reset}`);

  run('git fetch origin --quiet', { ignoreError: true });
  const counts = run('git rev-list --left-right --count origin/main...HEAD', {
    silent: true,
    ignoreError: true,
  }).trim();

  if (counts) {
    const [behind, ahead] = counts.split(/\s+/);
    console.log(
      `${C.bold}Sincronización con origin/main:${C.reset} ${ahead || 0} commits adelante, ${behind || 0} commits atrás`
    );
  }

  const status = run('git status -s', { silent: true });
  if (status.trim()) {
    console.log(`\n${C.yellow}Archivos modificados localmente:${C.reset}\n${status}`);
  } else {
    console.log(`\n${C.green}✓ Todo limpio (sin cambios pendientes por guardar).${C.reset}`);
  }
}

function cmdSync() {
  console.log(`\n${C.cyan}${C.bold}=== Sincronizando con GitHub (origin/main) ===${C.reset}`);
  run('git fetch origin');
  const branch = getBranch();
  if (branch === 'main') {
    run('git pull --rebase origin main');
  } else {
    run('git merge origin/main');
  }
  console.log(`\n${C.green}✓ Proyecto actualizado con los últimos cambios del equipo.${C.reset}`);
}

function cmdStart(rawName) {
  if (!rawName) {
    console.error(`${C.red}Error: Debes indicar el nombre de la tarea. Ejemplo: npm run flow -- start ajuste-templates${C.reset}`);
    process.exit(1);
  }
  const cleanName = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_\/]/g, '-')
    .replace(/^feat\//, '');
  const branchName = `feat/${cleanName}`;

  console.log(`\n${C.cyan}${C.bold}=== Iniciando nueva tarea: ${branchName} ===${C.reset}`);
  run('git fetch origin');
  run(`git checkout -B ${branchName} origin/main`);
  console.log(`\n${C.green}✓ Rama ${branchName} creada y actualizada desde main.${C.reset}`);
}

function cmdSave(commitMsg) {
  const msg = commitMsg && commitMsg.trim() ? commitMsg.trim() : 'feat: update clio notes';
  const branch = getBranch();

  console.log(`\n${C.cyan}${C.bold}=== Paso 1/3: Verificando compilación (npm run build) ===${C.reset}`);
  run('npm run build');

  console.log(`\n${C.cyan}${C.bold}=== Paso 2/3: Guardando cambios en Git (${branch}) ===${C.reset}`);
  run('git add -A');
  const status = run('git status -s', { silent: true }).trim();
  if (!status) {
    console.log(`${C.yellow}No hay cambios nuevos para hacer commit.${C.reset}`);
  } else {
    const safeMsg = msg.replace(/"/g, '\\"');
    run(`git commit -m "${safeMsg}"`);
  }

  console.log(`\n${C.cyan}${C.bold}=== Paso 3/3: Subiendo a GitHub ===${C.reset}`);
  run(`git push -u origin ${branch}`);

  console.log(`\n${C.green}${C.bold}✓ ¡Cambios verificados y subidos a GitHub!${C.reset}`);
  if (branch !== 'main') {
    console.log(
      `${C.cyan}Abre o revisa el Pull Request aquí:${C.reset} ${REPO_URL}/compare/main...${branch}?expand=1`
    );
  } else {
    console.log(`${C.cyan}Repositorio actualizado:${C.reset} ${REPO_URL}`);
  }
}

function cmdDeploy(target = 'all') {
  const mode = (target || 'all').toLowerCase();
  console.log(`\n${C.cyan}${C.bold}=== Desplegando a Producción (${VPS_HOST}) [Modo: ${mode}] ===${C.reset}`);

  if (mode === 'all' || mode === 'web') {
    console.log(`\n${C.yellow}-> Compilando y subiendo Frontend a /var/www/clionotes...${C.reset}`);
    run('npm run build');
    run(`scp -r dist/* ${VPS_HOST}:/var/www/clionotes/`);
    console.log(`${C.green}✓ Frontend desplegado en https://notes.clinicflow.dev${C.reset}`);
  }

  if (mode === 'all' || mode === 'n8n') {
    console.log(`\n${C.yellow}-> Sincronizando workflows de n8n...${C.reset}`);
    run('node scratch/sync_all_workflows.cjs');
    console.log(`${C.green}✓ Workflows de n8n sincronizados y contenedor reiniciado.${C.reset}`);
  }

  if (mode === 'all' || mode === 'bot') {
    console.log(`\n${C.yellow}-> Actualizando Amexzone RPA Bot en /root/amexzone-notes-bot...${C.reset}`);
    run(`scp amexzone-bot/worker.js ${VPS_HOST}:/root/amexzone-notes-bot/worker.js`);
    run(`scp amexzone-bot/src/amexzone/*.js ${VPS_HOST}:/root/amexzone-notes-bot/src/amexzone/`);
    run(`ssh ${VPS_HOST} "pm2 restart amexzone-worker"`);
    console.log(`${C.green}✓ RPA Bot actualizado y reiniciado en PM2.${C.reset}`);
  }

  console.log(`\n${C.green}${C.bold}✓ ¡Despliegue completado con éxito!${C.reset}`);
}

async function interactiveMenu() {
  cmdStatus();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log(`\n${C.cyan}${C.bold}¿Qué deseas hacer?${C.reset}`);
  console.log(`  ${C.bold}1)${C.reset} Sincronizar últimos cambios del equipo (sync)`);
  console.log(`  ${C.bold}2)${C.reset} Empezar nueva tarea en rama limpia (start)`);
  console.log(`  ${C.bold}3)${C.reset} Verificar build, guardar y subir a GitHub (save)`);
  console.log(`  ${C.bold}4)${C.reset} Desplegar a producción clinicflow.dev (deploy)`);
  console.log(`  ${C.bold}5)${C.reset} Salir\n`);

  const choice = (await ask('Selecciona una opción (1-5): ')).trim();

  try {
    if (choice === '1') {
      cmdSync();
    } else if (choice === '2') {
      const name = await ask('Nombre corto de la tarea (ej: mejoras-login): ');
      cmdStart(name);
    } else if (choice === '3') {
      const msg = await ask('Descripción breve de los cambios: ');
      cmdSave(msg);
    } else if (choice === '4') {
      const target = await ask('¿Qué deseas desplegar? (all / web / n8n / bot) [all]: ');
      cmdDeploy(target.trim() || 'all');
    } else {
      console.log('Saliendo...');
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const [subcmd, ...rest] = process.argv.slice(2);
  if (!subcmd) {
    await interactiveMenu();
    return;
  }

  switch (subcmd.toLowerCase()) {
    case 'status':
      cmdStatus();
      break;
    case 'sync':
      cmdSync();
      break;
    case 'start':
      cmdStart(rest.join('-'));
      break;
    case 'save':
      cmdSave(rest.join(' '));
      break;
    case 'deploy':
      cmdDeploy(rest[0] || 'all');
      break;
    default:
      console.log(`Comando desconocido: ${subcmd}`);
      console.log('Uso: npm run flow -- [status | sync | start <rama> | save "<mensaje>" | deploy [all|web|n8n|bot]]');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}✗ Error ejecutando flow:${C.reset}`, err.message);
  process.exit(1);
});
