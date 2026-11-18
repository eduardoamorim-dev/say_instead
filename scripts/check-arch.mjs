#!/usr/bin/env node
// Checagem estrutural da arquitetura. Transforma a regra de dependência em erro com instrução de conserto.
// Regras em scripts/config/arch-rules.json. Fonte: docs/architecture.md (Organização do código) e ADR-0004.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, c, globToRe, readJson, run, toPosix } from './lib/util.mjs';

const rules = readJson(path.join(ROOT, 'scripts/config/arch-rules.json'));
if (!rules) {
  console.error(c.red('✖ scripts/config/arch-rules.json ausente ou inválido.'));
  process.exit(1);
}

const violations = [];
const add = (code, what, rule, fix) => violations.push({ code, what, rule, fix });
const nameMatches = (pattern, name) => globToRe(pattern).test(name);

// ------------------------------------------------------------ Rust
if (fs.existsSync(path.join(ROOT, 'Cargo.toml'))) {
  const r = run('cargo metadata --no-deps --format-version 1');
  if (r.code !== 0) {
    console.error(c.red('✖ `cargo metadata` falhou; não dá para checar a arquitetura.'));
    console.error(r.out.trim().split(/\r?\n/).slice(-15).join('\n'));
    console.error('  Como corrigir: conserte o Cargo.toml apontado acima (ou instale o Rust: `node scripts/doctor.mjs`).');
    process.exit(1);
  }
  const meta = JSON.parse(r.out.slice(r.out.indexOf('{')));
  const wsRoot = meta.workspace_root;
  const dirOf = (manifest) => toPosix(path.relative(wsRoot, path.dirname(manifest)));
  const pkgs = meta.packages.map((p) => ({ name: p.name, dir: dirOf(p.manifest_path), deps: p.dependencies }));

  for (const p of pkgs) {
    const rule = rules.workspace[p.dir];
    if (!rule) {
      add(
        'ARQ000',
        `crate "${p.name}" em ${p.dir} não está previsto na arquitetura`,
        'o workspace tem seis crates em crates/ mais a casca em src-tauri/',
        'coloque o código num crate existente; crate novo exige ADR e entrada em scripts/config/arch-rules.json.',
      );
      continue;
    }
    for (const d of p.deps) {
      if (d.kind === 'dev') continue; // testes podem usar o que precisarem
      if (d.path) {
        const target = toPosix(path.relative(wsRoot, d.path));
        if (!rule.mayDependOn.includes(target)) {
          add(
            'ARQ001',
            `${p.dir} depende de ${target}`,
            `${p.dir} só pode depender de: ${rule.mayDependOn.join(', ') || 'nenhum crate do projeto'}`,
            `declare a necessidade como trait (porta) em crates/domain, implemente no adaptador e ligue os dois em src-tauri. Skill: rust-core.`,
          );
        }
        continue;
      }
      for (const e of rules.externalOnlyIn ?? []) {
        if (nameMatches(e.pattern, d.name) && !e.allowedIn.includes(p.dir)) {
          add(
            'ARQ002',
            `${p.dir} usa a biblioteca "${d.name}"`,
            `"${e.pattern}" só é permitida em ${e.allowedIn.join(', ')} — ${e.why}`,
            `mova o uso para ${e.allowedIn[0]} e exponha o que ${p.dir} precisa por uma porta do domínio.`,
          );
        }
      }
      for (const e of rules.externalDeniedIn ?? []) {
        if (nameMatches(e.pattern, d.name) && e.deniedIn.includes(p.dir)) {
          add('ARQ003', `${p.dir} usa a biblioteca "${d.name}"`, `"${e.pattern}" é proibida em ${p.dir} — ${e.why}`, 'remova a dependência; mantenha o crate livre de infraestrutura.');
        }
      }
    }
  }
}

// ------------------------------------------------------------ frontend
const fe = rules.frontend;
const feRoot = fe ? path.join(ROOT, fe.root) : null;
if (feRoot && fs.existsSync(feRoot)) {
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(full);
      return /\.(ts|tsx|js|jsx|mts)$/.test(e.name) ? [full] : [];
    });
  for (const file of walk(feRoot)) {
    const rel = toPosix(path.relative(ROOT, file));
    const src = fs.readFileSync(file, 'utf8');
    for (const b of fe.importBoundaries ?? []) {
      if (b.allowedIn.some((dir) => rel.startsWith(dir))) continue;
      const esc = b.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(from|import|require)\\s*\\(?\\s*['"]${esc}`).test(src)) {
        add('ARQ010', `${rel} importa "${b.pattern}…"`, `só ${b.allowedIn.join(', ')} pode importar "${b.pattern}" — ${b.why}`, `chame a função tipada de ${b.allowedIn[0]} (e crie-a lá se não existir). Skill: ui-frontend.`);
      }
    }
  }
}

// ------------------------------------------------------------ resultado
if (violations.length === 0) {
  console.log(c.green('✔ arquitetura: nenhuma violação'));
  process.exit(0);
}
for (const v of violations) {
  console.error(c.red(`✖ ${v.code} ${v.what}`));
  console.error(`  Regra: ${v.rule}`);
  console.error(`  Como corrigir: ${v.fix}`);
}
console.error(c.red(`${violations.length} violação(ões) de arquitetura. Se a regra estiver errada para o caso, PARE e proponha um ADR (skill write-adr).`));
process.exit(1);
