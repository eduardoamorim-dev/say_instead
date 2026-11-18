#!/usr/bin/env node
// Hook "Setup" do andar no Maestri: prepara um checkout novo para trabalhar.
// Um andar é um checkout limpo: não tem node_modules, nem arquivos ignorados pelo git.
// Configure no Maestri (Configurar hooks… → Setup):  node scripts/floor-setup.mjs
import fs from 'node:fs';
import path from 'node:path';
import { c, git, loadConfig, repoInfo, run, toolVersion } from './lib/util.mjs';

const floor = path.resolve(process.env.MAESTRI_FLOOR_PATH || process.cwd());
const root = process.env.MAESTRI_ROOT_PATH ? path.resolve(process.env.MAESTRI_ROOT_PATH) : null;
const info = repoInfo(floor);
if (!info) {
  console.error(c.red(`✖ ${floor} não é um checkout git.`));
  process.exit(1);
}
const cfg = loadConfig(floor);
console.log(c.bold(`andar: ${process.env.MAESTRI_FLOOR_NAME ?? path.basename(floor)} · branch ${info.branch}`));
if (info.branch === cfg.mainBranch) console.log(c.yellow(`! este checkout está em ${cfg.mainBranch}; andar de tarefa usa branch ${cfg.taskBranchPrefix}T-NNNN-slug.`));

let failed = false;
const step = (label, cmd) => {
  const t0 = Date.now();
  const r = run(cmd, { cwd: floor });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.code === 0) console.log(`${c.green('✔')} ${label} ${c.dim(`(${secs}s)`)}`);
  else {
    failed = true;
    console.log(c.red(`✖ ${label} — \`${cmd}\``));
    console.log(r.out.trimEnd().split(/\r?\n/).slice(-25).join('\n'));
  }
};

// 1. arquivos locais que o git ignora (lista em .worktreeinclude), copiados do térreo
const include = path.join(floor, '.worktreeinclude');
if (root && root !== floor && fs.existsSync(include)) {
  for (const rel of fs.readFileSync(include, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
    const from = path.join(root, rel);
    const to = path.join(floor, rel);
    if (!fs.existsSync(from) || fs.existsSync(to) || !fs.statSync(from).isFile()) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`${c.green('✔')} copiado do térreo: ${rel}`);
  }
}

// 2. dependências
const exists = (p) => fs.existsSync(path.join(floor, p));
if (exists('package.json')) {
  if (exists('pnpm-lock.yaml')) step('dependências JS', 'pnpm install --frozen-lockfile');
  else if (exists('package-lock.json')) step('dependências JS', 'npm ci');
  else console.log(c.dim('○ dependências JS — sem lockfile ainda'));
} else console.log(c.dim('○ dependências JS — o projeto ainda não tem package.json'));

if (exists('Cargo.toml')) {
  if (toolVersion('cargo')) step('dependências Rust', exists('Cargo.lock') ? 'cargo fetch --locked' : 'cargo fetch');
  else {
    failed = true;
    console.log(c.red('✖ cargo ausente — rode `node scripts/doctor.mjs`.'));
  }
} else console.log(c.dim('○ dependências Rust — o projeto ainda não tem Cargo.toml'));

// 3. qual é a tarefa
const id = (new RegExp(`^${cfg.taskBranchPrefix}(T-\\d{4})-`).exec(info.branch) ?? [])[1];
const dir = path.join(floor, 'docs/board/tasks');
const file = id && fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => f.startsWith(`${id}-`)) : null;
if (file) console.log(`tarefa: docs/board/tasks/${file}`);
else console.log(c.yellow('! nenhuma tarefa corresponde a esta branch; confirme com o Maestro.'));
const behind = git(['rev-list', '--count', `HEAD..${cfg.mainBranch}`], floor);
if (behind && behind !== '0') console.log(c.dim(`${cfg.mainBranch} está ${behind} commit(s) à frente desta branch.`));

process.exit(failed ? 1 : 0);
