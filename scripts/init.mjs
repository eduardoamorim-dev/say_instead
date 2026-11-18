#!/usr/bin/env node
// Grava os dados do projeto e troca os marcadores {{APP_NAME}} e {{REPO_SLUG}} nos arquivos do kit.
//   node scripts/init.mjs --name "Nome do App" --slug nome-do-app --owner usuario-github --license Apache-2.0
// Pode rodar de novo: só reescreve o que mudou.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, c, die, readJson } from './lib/util.mjs';

const opt = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];

const file = path.join(ROOT, 'scripts/config/project.json');
const cur = readJson(file, {});
const name = opt.name ?? (cur.initialized ? cur.name : null);
const slug = opt.slug ?? (cur.initialized ? cur.slug : null);
if (!name) die('falta --name "Nome do App".');
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) die('falta --slug (minúsculas, números e hífens), ex.: --slug analise-de-vendas.');

const next = { name, slug, owner: opt.owner ?? cur.owner ?? '', license: opt.license ?? cur.license ?? '', initialized: true };
fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);

let touched = 0;
for (const rel of ['README.md', 'CLAUDE.md', 'docs/architecture.md', 'docs/roadmap.md']) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) continue;
  const before = fs.readFileSync(f, 'utf8');
  const after = before.replaceAll('{{APP_NAME}}', name).replaceAll('{{REPO_SLUG}}', slug);
  if (after !== before) {
    fs.writeFileSync(f, after);
    touched++;
  }
}
console.log(`${c.green('✔')} projeto: ${name} (${slug})${next.owner ? ` · github.com/${next.owner}/${slug}` : ''}${next.license ? ` · ${next.license}` : ''}`);
console.log(`  scripts/config/project.json gravado; ${touched} arquivo(s) atualizado(s).`);
