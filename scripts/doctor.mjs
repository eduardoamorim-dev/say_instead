#!/usr/bin/env node
// Diagnóstico do ambiente de desenvolvimento. Não instala nada: só diz o que falta e como resolver.
import path from 'node:path';
import { ROOT, c, git, isWin, run, toolVersion } from './lib/util.mjs';

const rows = [];
const row = (level, name, detail, fix) => rows.push({ level, name, detail, fix });
const atLeast = (s, major, minor = 0) => {
  const [a = 0, b = 0] = (/(\d+)\.(\d+)/.exec(s ?? '') ?? []).slice(1).map(Number);
  return a > major || (a === major && b >= minor);
};

// ------------------------------------------------------------ sistema
if (isWin) row('ok', 'sistema', 'Windows');
else {
  row('warn', 'sistema', `${process.platform} — o app só compila e roda no Windows`,
    'use este ambiente só para o harness; para compilar o app, abra o projeto no Windows nativo (não no WSL).');
}

// ------------------------------------------------------------ obrigatórios
row(atLeast(process.version, 22) ? 'ok' : 'fail', 'node', process.version, 'instale o Node LTS (22 ou mais novo): winget install OpenJS.NodeJS.LTS');

const gitV = toolVersion('git');
row(gitV && atLeast(gitV, 2, 40) ? 'ok' : 'fail', 'git', gitV ?? 'ausente', 'instale o Git for Windows: winget install Git.Git');

const cargo = toolVersion('cargo');
row(cargo ? 'ok' : 'fail', 'cargo', cargo ?? 'ausente', 'instale o Rust: winget install Rustlang.Rustup, depois `rustup default stable`');
if (cargo) {
  const host = (/host: (\S+)/.exec(run('rustc -vV').out) ?? [])[1] ?? '?';
  if (isWin) {
    row(host.endsWith('windows-msvc') ? 'ok' : 'fail', 'toolchain', host,
      'use a toolchain MSVC (`rustup default stable-x86_64-pc-windows-msvc`) e instale as Build Tools do Visual Studio com a carga "Desenvolvimento para desktop com C++".');
  } else row('warn', 'toolchain', host, 'no Windows a toolchain precisa ser x86_64-pc-windows-msvc.');
  const fmt = toolVersion('cargo fmt');
  row(fmt ? 'ok' : 'fail', 'rustfmt', fmt ?? 'ausente', 'rustup component add rustfmt');
  const clippy = toolVersion('cargo clippy');
  row(clippy ? 'ok' : 'fail', 'clippy', clippy ?? 'ausente', 'rustup component add clippy');
}

const pnpm = toolVersion('pnpm');
row(pnpm ? 'ok' : 'fail', 'pnpm', pnpm ?? 'ausente', 'instale o pnpm: winget install pnpm.pnpm (ou `npm install -g pnpm`)');

// ------------------------------------------------------------ recomendados
const deny = toolVersion('cargo deny');
row(deny ? 'ok' : 'warn', 'cargo-deny', deny ?? 'ausente', 'será exigido por `verify --full` quando existir deny.toml: cargo install cargo-deny --locked');

const gh = toolVersion('gh');
row(gh ? 'ok' : 'warn', 'gh', gh ?? 'ausente', 'opcional, para criar o repositório e abrir PR: winget install GitHub.cli, depois `gh auth login`');

const claude = toolVersion('claude');
row(claude ? 'ok' : 'warn', 'claude', claude ?? 'ausente', 'instale o Claude Code nativo no Windows (PowerShell): irm https://claude.ai/install.ps1 | iex');

const maestri = run('maestri --help').code === 0;
row(maestri ? 'ok' : 'warn', 'maestri', maestri ? 'CLI disponível' : 'CLI não encontrada neste terminal', 'a CLI `maestri` só existe em terminal aberto pelo Maestri; fora dele, ignore este aviso.');

// ------------------------------------------------------------ git e caminhos
if (isWin) {
  const lp = git(['config', '--get', 'core.longpaths']);
  row(lp === 'true' ? 'ok' : 'warn', 'git longpaths', lp ?? 'não definido', 'caminhos de build do Rust dentro de andares ficam longos: git config --global core.longpaths true');
  row(ROOT.length <= 40 ? 'ok' : 'warn', 'caminho do projeto', `${ROOT} (${ROOT.length} caracteres)`,
    'prefira uma pasta curta, como C:\\dev\\<nome>, para não esbarrar no limite de 260 caracteres do Windows.');
  if (/^\\\\wsl/i.test(ROOT)) {
    row('fail', 'pasta no WSL', ROOT, 'mova o projeto para um disco do Windows (ex.: C:\\dev). Compilar a partir de \\\\wsl$ é lento e quebra o build do Tauri.');
  }
}
const inRepo = git(['rev-parse', '--is-inside-work-tree']) === 'true';
row(inRepo ? 'ok' : 'warn', 'repositório', inRepo ? path.basename(ROOT) : 'a pasta ainda não é um repositório git', 'rode `git init -b main` (o BOOTSTRAP.md faz isso).');
if (!git(['config', 'user.email'])) {
  row('fail', 'git user', 'user.name/user.email não configurados', 'git config --global user.name "Seu Nome" && git config --global user.email "voce@exemplo.com"');
}

// ------------------------------------------------------------ resultado
const icon = { ok: c.green('✔'), warn: c.yellow('!'), fail: c.red('✖') };
for (const r of rows) {
  console.log(`${icon[r.level]} ${r.name.padEnd(20)} ${r.detail}`);
  if (r.level !== 'ok') console.log(`    ${r.fix}`);
}
const fails = rows.filter((r) => r.level === 'fail').length;
const warns = rows.filter((r) => r.level === 'warn').length;
console.log(fails ? c.red(`\n${fails} item(ns) obrigatório(s) faltando.`) : c.green(`\nAmbiente pronto${warns ? ` (${warns} aviso(s))` : ''}.`));
process.exit(fails ? 1 : 0);
