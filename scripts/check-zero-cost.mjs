#!/usr/bin/env node
// Guarda do princípio 1: o projeto não paga por nada (ADR-0002).
// Barra, de forma determinística, o que geraria conta: runner pago, segredo de API paga no CI, SDK de serviço pago.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, c, globToRe, readJson, toPosix } from './lib/util.mjs';

const policy = readJson(path.join(ROOT, 'scripts/config/policy.json'));
if (!policy) {
  console.error(c.red('✖ scripts/config/policy.json ausente ou inválido.'));
  process.exit(1);
}
const problems = [];
const add = (where, what, fix) => problems.push({ where, what, fix });
const matches = (patterns, name) => patterns.find((p) => globToRe(p).test(name));

// ------------------------------------------------------------ workflows do GitHub Actions
const wfDir = path.join(ROOT, '.github', 'workflows');
if (fs.existsSync(wfDir)) {
  for (const f of fs.readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n))) {
    const rel = `.github/workflows/${f}`;
    const lines = fs.readFileSync(path.join(wfDir, f), 'utf8').split(/\r?\n/);
    lines.forEach((raw, i) => {
      const line = raw.replace(/#.*$/, '');
      const at = `${rel}:${i + 1}`;
      const ro = /runs-on:\s*(.+)$/.exec(line);
      if (ro) {
        const labels = ro[1].replace(/[[\]'"]/g, ' ').split(/[\s,]+/).filter(Boolean);
        for (const l of labels) {
          if (l.includes('${{')) {
            add(at, `runner definido por expressão (${l})`, 'escreva o runner literalmente (ex.: windows-latest) para a checagem conseguir ler.');
          } else if (!policy.allowedRunners.includes(l)) {
            add(at, `runner "${l}" fora da lista gratuita`, `use um de: ${policy.allowedRunners.join(', ')}. Runners maiores e self-hosted geram custo ou risco.`);
          }
        }
      }
      for (const m of line.matchAll(/secrets\.([A-Za-z0-9_]+)/g)) {
        if (!policy.allowedSecrets.includes(m[1])) {
          add(at, `segredo "${m[1]}" não previsto`, `o CI só roda a camada determinística: nenhuma chave de IA ou de nuvem. Segredos aceitos: ${policy.allowedSecrets.join(', ')}.`);
        }
      }
    });
  }
}

// ------------------------------------------------------------ dependências
const cargoFiles = ['Cargo.toml', 'src-tauri/Cargo.toml'];
const cratesDir = path.join(ROOT, 'crates');
if (fs.existsSync(cratesDir)) {
  for (const d of fs.readdirSync(cratesDir)) cargoFiles.push(`crates/${d}/Cargo.toml`);
}
for (const rel of cargoFiles) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  let inDeps = false;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const sec = /^\s*\[([^\]]+)\]/.exec(line);
    if (sec) {
      const table = /dependencies\.([A-Za-z0-9_-]+)$/.exec(sec[1]);
      inDeps = /dependencies$/.test(sec[1]);
      if (table) check(table[1], `${rel}:${i + 1}`, 'cargo');
      return;
    }
    const dep = inDeps && /^\s*([A-Za-z0-9_-]+)\s*(=|\.)/.exec(line);
    if (dep) check(dep[1], `${rel}:${i + 1}`, 'cargo');
  });
}
for (const rel of ['package.json', 'ui/package.json']) {
  const pkg = readJson(path.join(ROOT, rel));
  if (!pkg) continue;
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) check(name, rel, 'npm');
}
function check(name, where, eco) {
  const hit = matches(policy.forbiddenDependencies?.[eco] ?? [], name);
  if (hit) add(toPosix(where), `dependência "${name}" (padrão ${hit}) é SDK de serviço pago ou de telemetria`, 'remova. O app não tem telemetria nem serviço de nuvem próprio; se precisar mesmo, proponha um ADR.');
}

// ------------------------------------------------------------ resultado
if (problems.length === 0) {
  console.log(c.green('✔ custo zero: nada que gere conta'));
  process.exit(0);
}
for (const p of problems) {
  console.error(c.red(`✖ ${p.where}: ${p.what}`));
  console.error(`  Como corrigir: ${p.fix}`);
}
process.exit(1);
