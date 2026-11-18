#!/usr/bin/env node
// Hook "Teardown" do andar no Maestri: avisa se há trabalho que se perderia e libera disco.
// Configure no Maestri (Configurar hooks… → Teardown):  node scripts/floor-teardown.mjs
import fs from 'node:fs';
import path from 'node:path';
import { c, git, gitCode, loadConfig, repoInfo } from './lib/util.mjs';

const floor = path.resolve(process.env.MAESTRI_FLOOR_PATH || process.cwd());
const info = repoInfo(floor);
if (!info) process.exit(0);
const cfg = loadConfig(floor);

// Trava de segurança: nunca limpar o térreo.
const gitDir = git(['rev-parse', '--absolute-git-dir'], floor);
const common = git(['rev-parse', '--git-common-dir'], floor);
const isMainCheckout = gitDir && common && path.resolve(floor, common) === path.resolve(gitDir);
if (isMainCheckout) {
  console.log(c.yellow('! este é o checkout principal (térreo), não um andar: nada foi limpo.'));
  process.exit(0);
}

let risk = false;
const dirty = (git(['status', '--porcelain'], floor) ?? '').split(/\r?\n/).filter(Boolean);
if (dirty.length) {
  risk = true;
  console.log(c.red(`✖ ${dirty.length} arquivo(s) com mudança não commitada neste andar:`));
  for (const l of dirty.slice(0, 10)) console.log(`    ${l}`);
}
if (info.branch !== '(detached)' && gitCode(['merge-base', '--is-ancestor', 'HEAD', cfg.mainBranch], floor) !== 0) {
  risk = true;
  const n = git(['rev-list', '--count', `${cfg.mainBranch}..HEAD`], floor);
  console.log(c.red(`✖ a branch ${info.branch} tem ${n ?? '?'} commit(s) que não estão em ${cfg.mainBranch}.`));
  console.log('    Eles continuam na branch depois que o andar some, mas confira se a tarefa aterrissou.');
}
if (risk) {
  console.log(c.yellow('! há trabalho não aterrissado: o disco NÃO foi limpo. Resolva e desmonte de novo.'));
  process.exit(1);
}

for (const rel of ['target', 'node_modules', 'ui/node_modules', 'ui/dist', '.verify']) {
  const p = path.join(floor, rel);
  if (!fs.existsSync(p)) continue;
  fs.rmSync(p, { recursive: true, force: true });
  console.log(`${c.green('✔')} removido ${rel}`);
}
console.log(c.green('✔ andar limpo.'));
