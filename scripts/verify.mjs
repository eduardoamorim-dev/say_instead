#!/usr/bin/env node
// Verificação única do projeto. É o "sinal de pronto" que agente e CI usam.
//
//   node scripts/verify.mjs            rápido: formata, lint, testes de unidade
//   node scripts/verify.mjs --full     tudo que roda em todo commit (igual ao CI)
//   node scripts/verify.mjs --slow     testes lentos marcados com #[ignore] (modelos em cache)
//   --check       não corrige nada (CI); sem ela, a formatação é aplicada no lugar
//   --only=a,b    só os passos citados (não grava carimbo)
//   --list        mostra os passos e sai
//
// Regra: parte do projeto que ainda não existe é PULADA; ferramenta que falta é FALHA.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, c, codeHash, readJson, run, toolVersion, workingTreeHash, writeStamp } from './lib/util.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const mode = has('--full') ? 'full' : has('--slow') ? 'slow' : 'quick';
const check = has('--check') || process.env.CI === 'true';
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);

const exists = (p) => fs.existsSync(path.join(ROOT, p));
const pkg = readJson(path.join(ROOT, 'package.json'));
const pm = exists('pnpm-lock.yaml') || exists('pnpm-workspace.yaml') ? 'pnpm' : 'npm';
const script = (s) => Boolean(pkg?.scripts?.[s]);
const cargo = exists('Cargo.toml');
const locked = check ? ' --locked' : '';
const BASE = ['quick', 'full'];

/** @type {{name:string, group:string, modes:string[], when:()=>boolean, need?:[string,string,string], cmd:string, fix:string}[]} */
const steps = [
  {
    name: 'board', group: 'harness', modes: BASE, when: () => exists('docs/board/tasks'),
    cmd: 'node scripts/task.mjs check',
    fix: 'corrija o arquivo de tarefa apontado (formato em docs/board/README.md).',
  },
  {
    name: 'zero-cost', group: 'harness', modes: BASE, when: () => true,
    cmd: 'node scripts/check-zero-cost.mjs',
    fix: 'remova o serviço/segredo/dependência paga; exceção só com ADR aprovado por humano.',
  },
  {
    name: 'arch', group: 'harness', modes: BASE, when: () => cargo || exists('ui/src'),
    cmd: 'node scripts/check-arch.mjs',
    fix: 'siga a correção indicada em cada violação; não edite scripts/config/arch-rules.json sem ADR.',
  },
  {
    name: 'rust:fmt', group: 'rust', modes: BASE, when: () => cargo, need: ['cargo', '--version', 'instale o Rust (rustup) com a toolchain MSVC'],
    cmd: check ? 'cargo fmt --all -- --check' : 'cargo fmt --all',
    fix: 'rode `cargo fmt --all`.',
  },
  {
    name: 'rust:clippy', group: 'rust', modes: BASE, when: () => cargo,
    cmd: `cargo clippy --workspace --all-targets${locked} -- -D warnings`,
    fix: 'corrija a causa do aviso; `#[allow]` só com comentário explicando por quê.',
  },
  {
    name: 'rust:test', group: 'rust', modes: ['quick'], when: () => cargo,
    cmd: `cargo test --workspace --lib --bins${locked}`,
    fix: 'leia o teste que falhou antes de mexer no código; não apague nem enfraqueça teste para passar.',
  },
  {
    name: 'rust:test', group: 'rust', modes: ['full'], when: () => cargo,
    cmd: `cargo test --workspace --all-targets${locked}`,
    fix: 'leia o teste que falhou antes de mexer no código; não apague nem enfraqueça teste para passar.',
  },
  {
    name: 'rust:doctest', group: 'rust', modes: ['full'], when: () => cargo,
    cmd: `cargo test --workspace --doc${locked}`,
    fix: 'atualize o exemplo da documentação junto com a API.',
  },
  {
    name: 'rust:deny', group: 'rust', modes: ['full'], when: () => cargo && exists('deny.toml'),
    need: ['cargo deny', '--version', 'instale com `cargo install cargo-deny --locked` (gratuito)'],
    cmd: 'cargo deny check',
    fix: 'troque a dependência com licença/vulnerabilidade barrada; a lista de licenças aceitas fica em deny.toml (ADR).',
  },
  {
    name: 'rust:slow', group: 'rust', modes: ['slow'], when: () => cargo,
    cmd: 'cargo test --workspace -- --ignored',
    fix: 'teste lento falhou: confira se os modelos estão em cache e a taxa de erro esperada.',
  },
  {
    name: 'js:lint', group: 'js', modes: BASE, when: () => script('lint'), need: [pm, '--version', `instale o ${pm}`],
    cmd: `${pm} run lint`, fix: 'corrija o lint; não desligue regra sem registrar o motivo.',
  },
  {
    name: 'js:typecheck', group: 'js', modes: BASE, when: () => script('typecheck'),
    cmd: `${pm} run typecheck`, fix: 'corrija os tipos; `any` e `@ts-ignore` não são correção.',
  },
  {
    name: 'js:test', group: 'js', modes: BASE, when: () => script('test'),
    cmd: `${pm} run test`, fix: 'o script `test` precisa rodar uma vez e sair (ex.: `vitest run`).',
  },
  {
    name: 'js:bindings', group: 'js', modes: ['full'], when: () => script('bindings:check'),
    cmd: `${pm} run bindings:check`, fix: 'regenere os tipos de IPC (tauri-specta) e commite o resultado.',
  },
  {
    name: 'js:build', group: 'js', modes: ['full'], when: () => script('build:ui'),
    cmd: `${pm} run build:ui`, fix: 'o build da interface precisa passar sem avisos de tipo.',
  },
  {
    name: 'harness:selftest', group: 'selftest', modes: ['full'], when: () => exists('scripts/selftest.mjs'),
    cmd: 'node scripts/selftest.mjs',
    fix: 'um guarda ou script do harness quebrou; conserte antes de seguir (docs/harness.md).',
  },
];

const plan = steps.filter((s) => s.modes.includes(mode) && (only.length === 0 || only.includes(s.name)));

if (has('--list')) {
  for (const s of plan) console.log(`${s.when() ? '•' : c.dim('○')} ${s.name.padEnd(18)} ${c.dim(s.cmd)}`);
  process.exit(0);
}

const logDir = path.join(ROOT, '.verify', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const tail = (text, n = 60) => text.trimEnd().split(/\r?\n/).slice(-n).join('\n');

const results = [];
const failedGroups = new Set();
console.log(c.bold(`verify ${mode}${check ? ' (somente checagem)' : ''}`));

for (const s of plan) {
  if (!s.when()) {
    results.push({ name: s.name, status: 'skipped', why: 'ainda não existe no projeto' });
    console.log(c.dim(`○ ${s.name} — pulado (ainda não existe no projeto)`));
    continue;
  }
  if (failedGroups.has(s.group)) {
    results.push({ name: s.name, status: 'skipped', why: 'falha anterior no mesmo grupo' });
    console.log(c.dim(`○ ${s.name} — pulado (falha anterior em ${s.group})`));
    continue;
  }
  if (s.need && !toolVersion(s.need[0], s.need[1])) {
    failedGroups.add(s.group);
    results.push({ name: s.name, status: 'failed', why: `ferramenta ausente: ${s.need[0]}` });
    console.log(c.red(`✖ ${s.name} — ferramenta ausente: ${s.need[0]}`));
    console.log(`  Como corrigir: ${s.need[2]}. Rode \`node scripts/doctor.mjs\` para o diagnóstico completo.`);
    continue;
  }
  const t0 = Date.now();
  const r = run(s.cmd);
  const ms = Date.now() - t0;
  const logFile = path.join(logDir, `${s.name.replace(/[^a-z0-9]+/gi, '-')}.log`);
  fs.writeFileSync(logFile, r.out);
  if (r.code === 0) {
    results.push({ name: s.name, status: 'passed', ms });
    console.log(`${c.green('✔')} ${s.name} ${c.dim(`(${(ms / 1000).toFixed(1)}s)`)}`);
  } else {
    failedGroups.add(s.group);
    results.push({ name: s.name, status: 'failed', ms });
    console.log(c.red(`✖ ${s.name} — \`${s.cmd}\` saiu com código ${r.code}`));
    console.log(tail(r.out));
    console.log(`  Como corrigir: ${s.fix}`);
    console.log(c.dim(`  Saída completa: ${path.relative(ROOT, logFile)}`));
  }
}

const failed = results.filter((r) => r.status === 'failed');
const passed = results.filter((r) => r.status === 'passed');
const ok = failed.length === 0;

if (only.length === 0) {
  const tree = workingTreeHash(ROOT);
  const code = codeHash(tree, ROOT);
  if (tree && code) {
    writeStamp(ROOT, { tree, code, mode, ok, check, at: new Date().toISOString(), steps: results });
    console.log(c.dim(`carimbo: ${code.slice(0, 12)} (${mode})`));
  }
}

console.log(
  ok
    ? c.green(`VERIFY ${mode}: OK — ${passed.length} passaram, ${results.length - passed.length} pulados`)
    : c.red(`VERIFY ${mode}: FALHOU — ${failed.map((f) => f.name).join(', ')}`),
);
process.exit(ok ? 0 : 1);
