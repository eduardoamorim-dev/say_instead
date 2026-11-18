// Utilitários compartilhados pelo harness (scripts e hooks).
// Só Node padrão, sem dependências: roda igual em Windows nativo, Git Bash, WSL e CI.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do checkout onde este arquivo mora (o térreo ou um andar). */
export const ROOT = path.resolve(HERE, '..', '..');

export const isWin = process.platform === 'win32';
export const toPosix = (p) => p.replace(/\\/g, '/');

// ---------------------------------------------------------------- saída
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = { red: paint(31), green: paint(32), yellow: paint(33), dim: paint(2), bold: paint(1) };

export function die(msg, fix) {
  console.error(c.red(`✖ ${msg}`));
  if (fix) console.error(`  Como corrigir: ${fix}`);
  process.exit(1);
}

// ---------------------------------------------------------------- processos
/** Roda git sem shell. Devolve stdout (sem a quebra final) ou null se falhar. */
export function git(args, cwd = ROOT, env) {
  const r = spawnSync('git', args, { cwd, env: env ?? process.env, encoding: 'utf8', windowsHide: true });
  if (r.error || r.status !== 0) return null;
  return r.stdout.replace(/\r?\n$/, '');
}

/** Só o código de saída de um comando git (útil para `diff --quiet`, `merge-base --is-ancestor`). */
export function gitCode(args, cwd = ROOT) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  return r.error ? -1 : r.status;
}

/** Roda uma linha de comando pelo shell (necessário para .cmd no Windows, como pnpm). */
export function run(cmd, { cwd = ROOT, env, inherit = false } = {}) {
  const r = spawnSync(cmd, {
    cwd,
    env: env ?? process.env,
    shell: true,
    encoding: 'utf8',
    windowsHide: true,
    stdio: inherit ? 'inherit' : 'pipe',
    maxBuffer: 128 * 1024 * 1024,
  });
  return { code: r.error ? 127 : (r.status ?? 1), out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** Primeira linha de `<tool> --version`, ou null se a ferramenta não existir. */
export function toolVersion(tool, arg = '--version') {
  const r = run(`${tool} ${arg}`);
  return r.code === 0 ? r.out.trim().split(/\r?\n/)[0] : null;
}

// ---------------------------------------------------------------- arquivos e config
export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const DEFAULTS = {
  mainBranch: 'main',
  taskBranchPrefix: 'task/',
  wipLimit: 2,
  productPaths: ['crates/', 'src-tauri/', 'ui/', 'evals/'],
  verifyPaths: ['crates/', 'src-tauri/', 'ui/', 'evals/', 'scripts/', '.claude/hooks/', '.github/workflows/'],
  boardPaths: ['docs/board/tasks/', 'docs/board/reviews/', 'docs/board/log.md', 'docs/roadmap.md'],
  protected: { deny: [], ask: [] },
};

export function loadConfig(root = ROOT) {
  return { ...DEFAULTS, ...readJson(path.join(root, 'scripts/config/harness.json'), {}) };
}

/** Converte glob simples (`*`, `**`, `?`) em RegExp ancorada. Caminhos sempre com `/`. */
export function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, isWin ? 'i' : '');
}

/**
 * `rel` casa com algum padrão?
 * - padrão terminado em `/`  → prefixo de diretório
 * - padrão sem `/`           → compara com o nome do arquivo, em qualquer pasta
 * - demais                   → glob sobre o caminho relativo inteiro
 */
export function matchAny(rel, patterns = []) {
  const norm = isWin ? rel.toLowerCase() : rel;
  const base = rel.split('/').pop();
  return patterns.find((p) => {
    if (p.endsWith('/')) return norm.startsWith(isWin ? p.toLowerCase() : p);
    if (!p.includes('/')) return globToRe(p).test(base);
    return globToRe(p).test(rel);
  });
}

/** Resolve o caminho real mesmo quando o arquivo ainda não existe (sobe até um ancestral existente). */
export function realish(p) {
  let cur = path.resolve(p);
  const tail = [];
  while (!fs.existsSync(cur)) {
    const up = path.dirname(cur);
    if (up === cur) return path.resolve(p);
    tail.unshift(path.basename(cur));
    cur = up;
  }
  try {
    cur = fs.realpathSync.native(cur);
  } catch {
    /* mantém */
  }
  return path.join(cur, ...tail);
}

// ---------------------------------------------------------------- git
/** Checkout e branch que contêm `target` (arquivo ou pasta, existente ou não). */
export function repoInfo(target = ROOT) {
  let dir = realish(target);
  while (!fs.existsSync(dir)) {
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  if (!fs.statSync(dir).isDirectory()) dir = path.dirname(dir);
  const top = git(['rev-parse', '--show-toplevel'], dir);
  if (!top) return null;
  const branch = git(['symbolic-ref', '--short', '-q', 'HEAD'], dir) ?? '(detached)';
  return { top: realish(top), branch };
}

/** Caminho de `file` relativo ao checkout, com `/`. null se estiver fora dele. */
export function relTo(top, file) {
  const rel = toPosix(path.relative(top, realish(file)));
  return rel.startsWith('..') || path.isAbsolute(rel) ? null : rel;
}

/**
 * Hash do conteúdo da árvore de trabalho (rastreados + novos, respeitando .gitignore).
 * Não depende de commit: o mesmo conteúdo dá o mesmo hash antes e depois de commitar.
 * Usa um índice temporário, então não mexe no stage do usuário.
 */
export function workingTreeHash(top = ROOT) {
  const gitDir = git(['rev-parse', '--absolute-git-dir'], top);
  if (!gitDir) return null;
  const idx = git(['rev-parse', '--git-path', 'index'], top);
  const tmp = path.join(gitDir, `harness-index-${process.pid}-${Date.now()}`);
  try {
    const real = idx ? path.resolve(top, idx) : null;
    if (real && fs.existsSync(real)) fs.copyFileSync(real, tmp);
  } catch {
    /* começa de índice vazio */
  }
  const env = { ...process.env, GIT_INDEX_FILE: tmp };
  try {
    if (git(['add', '-A', '.'], top, env) === null) return null;
    return git(['write-tree'], top, env);
  } finally {
    for (const f of [tmp, `${tmp}.lock`]) fs.rmSync(f, { force: true });
  }
}

/**
 * Hash só da parte da árvore que a verificação cobre (`verifyPaths`).
 * Editar documentação, relatório ou quadro não muda este hash; editar código, sim.
 * `treeish` pode ser o hash de `workingTreeHash`, uma branch ou um commit.
 */
export function codeHash(treeish, top = ROOT, paths = loadConfig(top).verifyPaths) {
  if (!treeish) return null;
  const out = git(['ls-tree', '-r', treeish, '--', ...paths.map((p) => p.replace(/\/$/, ''))], top);
  return out === null ? null : createHash('sha256').update(out).digest('hex');
}

/** Worktrees do repositório: [{ path, branch }]. */
export function worktrees(cwd = ROOT) {
  const out = git(['worktree', 'list', '--porcelain'], cwd) ?? '';
  const list = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      cur = { path: line.slice(9), branch: null };
      list.push(cur);
    } else if (line.startsWith('branch ') && cur) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
  }
  return list;
}

// ---------------------------------------------------------------- carimbo de verificação
const stampFile = (top) => path.join(top, '.verify', 'stamp.json');
export const readStamp = (top = ROOT) => readJson(stampFile(top), null);
export function writeStamp(top, data) {
  fs.mkdirSync(path.dirname(stampFile(top)), { recursive: true });
  fs.writeFileSync(stampFile(top), `${JSON.stringify(data, null, 2)}\n`);
}

// ---------------------------------------------------------------- frontmatter (subconjunto de YAML)
const unquote = (s) => s.replace(/^(['"])(.*)\1$/, '$2');

/** Lê `chave: valor`, listas `[a, b]` e inteiros. Suficiente para tarefas, revisões e ADRs. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text, found: false };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else if (/^-?\d+$/.test(v)) v = Number(v);
    else v = unquote(v);
    data[kv[1]] = v;
  }
  return { data, body: m[2], found: true };
}

// ---------------------------------------------------------------- hooks
/**
 * Lê o JSON que o Claude Code entrega ao hook pela entrada padrão.
 * Leitura assíncrona de propósito: `readFileSync(0)` falha com pipe em algumas versões do Node no Windows.
 */
export async function readHookInput() {
  if (process.stdin.isTTY) return {};
  try {
    let data = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) data += chunk;
    return JSON.parse(data || '{}');
  } catch {
    return {};
  }
}

/** Interruptor humano: iniciar o `claude` com HARNESS_GUARD=off desliga os guardas. */
export const guardsOff = () => (process.env.HARNESS_GUARD ?? '').toLowerCase() === 'off';
