#!/usr/bin/env node
// Quadro de tarefas em arquivos, com máquina de estados.
// Cada transição tem pré-condições verificáveis; sem elas, o script recusa e diz o que falta.
//
//   node scripts/task.mjs list [--status S] [--milestone N] [--json]
//   node scripts/task.mjs next
//   node scripts/task.mjs show T-0001
//   node scripts/task.mjs new --title "..." --milestone 1 --area speech [--type feature] [--depends T-0001,T-0002]
//   node scripts/task.mjs move T-0001 <estado> [--note "..."] [--by quem] [--dry-run] [--no-commit] [--force "motivo"]
//   node scripts/task.mjs check
//   node scripts/task.mjs sync [--note "..."]
//
// Estados: backlog → ready → in_progress → review → verified → landed   (+ blocked, cancelled)
// O quadro só muda na branch principal (térreo). Ver docs/workflow.md.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, c, codeHash, die, git, gitCode, loadConfig, parseFrontmatter, readStamp, repoInfo, toPosix, worktrees, writeStamp } from './lib/util.mjs';

const cfg = loadConfig();
const MAIN = cfg.mainBranch;
const BOARD = path.join(ROOT, 'docs', 'board');
const TASKS = path.join(BOARD, 'tasks');

const STATES = ['backlog', 'ready', 'in_progress', 'review', 'verified', 'landed', 'blocked', 'cancelled'];
const TYPES = ['feature', 'spike', 'chore', 'bug'];
const AREAS = ['foundation', 'domain', 'application', 'speech', 'storage', 'providers', 'knowledge', 'analysis', 'shell', 'ui', 'release', 'harness', 'docs'];
const NEXT = {
  backlog: ['ready', 'blocked', 'cancelled'],
  ready: ['in_progress', 'backlog', 'blocked', 'cancelled'],
  in_progress: ['review', 'blocked', 'cancelled'],
  review: ['verified', 'in_progress', 'blocked', 'cancelled'],
  verified: ['landed', 'in_progress', 'blocked', 'cancelled'],
  blocked: [],
  landed: [],
  cancelled: [],
};
const WIP_STATES = ['in_progress', 'review', 'verified'];

// ------------------------------------------------------------ argumentos
const BOOL = new Set(['no-commit', 'dry-run', 'json']);
const pos = [];
const opt = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) {
    pos.push(a);
    continue;
  }
  const eq = a.indexOf('=');
  const key = eq > 0 ? a.slice(2, eq) : a.slice(2);
  if (eq > 0) opt[key] = a.slice(eq + 1);
  else if (BOOL.has(key) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) opt[key] = true;
  else opt[key] = argv[++i];
}
const [cmd, arg1, arg2] = pos;

// ------------------------------------------------------------ leitura
function loadTasks() {
  if (!fs.existsSync(TASKS)) return [];
  return fs
    .readdirSync(TASKS)
    .filter((f) => /^T-\d{4}-.+\.md$/.test(f))
    .sort()
    .map((name) => {
      const file = path.join(TASKS, name);
      const text = fs.readFileSync(file, 'utf8');
      const { data, body, found } = parseFrontmatter(text);
      const deps = Array.isArray(data.depends_on) ? data.depends_on : data.depends_on ? [data.depends_on] : [];
      return { ...data, depends_on: deps, name, file, text, body, found };
    });
}

function findTask(tasks, id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) die(`tarefa ${id ?? '(sem id)'} não existe.`, 'veja as existentes com `node scripts/task.mjs list`.');
  return t;
}

/** Conteúdo de uma seção `## Título`, sem comentários HTML. */
function section(body, title) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').replace(/<!--[\s\S]*?-->/g, '').trim();
}

function specProblems(t) {
  const p = [];
  const need = (title, test, msg) => {
    const s = section(t.body, title);
    if (s === null) p.push(`falta a seção "## ${title}".`);
    else if (!test(s)) p.push(msg);
  };
  need('Objetivo', (s) => s.length > 0, 'a seção "Objetivo" está vazia: diga em 1 a 3 frases o que passa a existir.');
  need('Fora de escopo', (s) => s.length > 0, 'a seção "Fora de escopo" está vazia: liste o que NÃO entra (ou escreva "nada").');
  need('Critérios de aceite', (s) => /^- \[[ xX]\] \S/m.test(s), 'faltam critérios de aceite verificáveis (linhas `- [ ] …`).');
  need('Verificação', (s) => s.length > 0, 'a seção "Verificação" está vazia: diga os comandos e a evidência esperada.');
  return p;
}

function readReview(id) {
  const file = path.join(BOARD, 'reviews', `${id}.md`);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const { data } = parseFrontmatter(text);
  const raw = /^commit:\s*["']?([0-9a-fA-F]+)["']?\s*$/m.exec(text);
  return { ...data, commit: raw ? raw[1].toLowerCase() : '' };
}

// ------------------------------------------------------------ git
const branchExists = (b) => git(['rev-parse', '--verify', '--quiet', `refs/heads/${b}`]) !== null;

function fullyVerified(branch) {
  const code = codeHash(branch, ROOT, cfg.verifyPaths);
  if (!code) return false;
  const places = [ROOT, ...worktrees().filter((w) => w.branch === branch).map((w) => w.path)];
  return places.some((p) => {
    const s = readStamp(p);
    return s && s.ok && s.mode === 'full' && s.code === code;
  });
}

/**
 * Depois de aterrissar: se o código de main é idêntico ao que foi verificado na branch,
 * o térreo herda o carimbo e não precisa recompilar para provar a mesma coisa.
 */
function inheritStamp(branch) {
  const code = codeHash(MAIN, ROOT, cfg.verifyPaths);
  const tree = git(['rev-parse', `${MAIN}^{tree}`]);
  if (!code || !tree) return false;
  for (const w of worktrees()) {
    const s = readStamp(w.path);
    if (s && s.ok && s.mode === 'full' && s.code === code) {
      writeStamp(ROOT, { ...s, tree, inheritedFrom: branch });
      return true;
    }
  }
  return false;
}

function staleAgainstMain(branch) {
  const mb = git(['merge-base', MAIN, branch]);
  if (!mb) return false;
  const paths = cfg.verifyPaths.map((p) => p.replace(/\/$/, ''));
  return gitCode(['diff', '--quiet', mb, MAIN, '--', ...paths]) === 1;
}

function requireMain(action) {
  const info = repoInfo(ROOT);
  if (!info || info.branch === MAIN || typeof opt.force === 'string') return;
  die(
    `não dá para ${action} na branch "${info.branch}": o quadro só muda em "${MAIN}" (térreo).`,
    'peça ao Maestro (térreo). No andar, registre o que fez em docs/board/reports/<id>.md e avise.',
  );
}

function commitBoard(message) {
  if (opt['no-commit'] || !repoInfo(ROOT)) return;
  git(['add', '--', 'docs/board']);
  if (fs.existsSync(path.join(ROOT, 'docs', 'roadmap.md'))) git(['add', '--', 'docs/roadmap.md']);
  git(['commit', '-q', '-m', message, '--', 'docs/board', 'docs/roadmap.md']) ?? git(['commit', '-q', '-m', message, '--', 'docs/board']);
}

// ------------------------------------------------------------ validação
function validate(tasks) {
  const errs = [];
  const seen = new Map();
  for (const t of tasks) {
    const at = `docs/board/tasks/${t.name}`;
    const e = (msg) => errs.push(`${at}: ${msg}`);
    if (!t.found) {
      e('sem cabeçalho (frontmatter entre linhas `---`).');
      continue;
    }
    if (!/^T-\d{4}$/.test(String(t.id))) e(`id inválido "${t.id}" (esperado T-NNNN).`);
    else if (!t.name.startsWith(`${t.id}-`)) e(`o nome do arquivo precisa começar com ${t.id}-.`);
    if (seen.has(t.id)) e(`id repetido (também em ${seen.get(t.id)}).`);
    seen.set(t.id, t.name);
    if (!t.title) e('falta `title`.');
    if (!STATES.includes(t.status)) e(`status "${t.status}" inválido. Use: ${STATES.join(', ')}.`);
    if (!TYPES.includes(t.type)) e(`type "${t.type}" inválido. Use: ${TYPES.join(', ')}.`);
    if (!AREAS.includes(t.area)) e(`area "${t.area}" inválida. Use: ${AREAS.join(', ')}.`);
    if (!Number.isInteger(t.milestone) || t.milestone < 0 || t.milestone > 9) e(`milestone "${t.milestone}" inválido (0 a 9, ver docs/roadmap.md).`);
    const branch = `${cfg.taskBranchPrefix}${t.name.replace(/\.md$/, '')}`;
    if (t.branch !== branch) e(`branch deveria ser "${branch}".`);
    for (const d of t.depends_on) {
      if (d === t.id) e('depende de si mesma.');
      else if (!tasks.some((x) => x.id === d)) e(`depende de ${d}, que não existe.`);
    }
    if (t.status === 'blocked' && !STATES.includes(t.blocked_from)) e('tarefa bloqueada sem `blocked_from`.');
    if (!['backlog', 'cancelled', 'blocked'].includes(t.status)) for (const p of specProblems(t)) e(p);
  }
  // ciclos de dependência
  const state = new Map();
  const visit = (id, trail) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      errs.push(`dependência circular: ${[...trail, id].join(' → ')}.`);
      return;
    }
    state.set(id, 1);
    for (const d of tasks.find((x) => x.id === id)?.depends_on ?? []) visit(d, [...trail, id]);
    state.set(id, 2);
  };
  for (const t of tasks) visit(t.id, []);
  return errs;
}

// ------------------------------------------------------------ pré-condições de cada transição
function gate(t, to, tasks) {
  const p = [];
  const b = t.branch;
  const floorHint = `No andar da tarefa: commite tudo e rode \`node scripts/verify.mjs --full\`.`;

  if (to === 'ready') p.push(...specProblems(t));

  if (to === 'in_progress' && t.status === 'ready') {
    for (const d of t.depends_on) {
      const dep = tasks.find((x) => x.id === d);
      if (dep?.status !== 'landed') p.push(`depende de ${d}, que ainda não aterrissou (está em "${dep?.status ?? 'inexistente'}").`);
    }
    const wip = tasks.filter((x) => WIP_STATES.includes(x.status));
    if (wip.length >= cfg.wipLimit) {
      p.push(`limite de trabalho em andamento atingido (${wip.length}/${cfg.wipLimit}: ${wip.map((x) => x.id).join(', ')}). Aterrisse uma antes de abrir outra.`);
    }
  }

  if (to === 'review' || to === 'verified') {
    if (!branchExists(b)) p.push(`a branch ${b} não existe. Crie o andar a partir de ${MAIN} com essa branch.`);
    else {
      if (git(['cat-file', '-e', `${b}:docs/board/reports/${t.id}.md`]) === null) {
        p.push(`falta o relatório docs/board/reports/${t.id}.md commitado em ${b} (skill finish-task).`);
      }
      if (!fullyVerified(b)) p.push(`o topo de ${b} não tem verificação completa aprovada. ${floorHint}`);
      if (staleAgainstMain(b)) p.push(`${MAIN} recebeu código depois que ${b} saiu. No andar: \`git merge ${MAIN}\`, resolva, verifique de novo e commite.`);
    }
  }

  if (to === 'verified' || (to === 'in_progress' && t.status === 'review')) {
    const rv = readReview(t.id);
    if (!rv) p.push(`falta a revisão docs/board/reviews/${t.id}.md (skill review-task).`);
    else if (to === 'verified') {
      if (rv.verdict !== 'approved') p.push(`a revisão está com verdict "${rv.verdict}", não "approved".`);
      const tip = git(['rev-parse', b]) ?? '';
      if (rv.commit.length < 7 || !tip.startsWith(rv.commit)) {
        p.push(`a revisão cobre o commit "${rv.commit || '(vazio)'}", mas o topo de ${b} é ${tip.slice(0, 12)}. Revise o estado atual.`);
      }
    } else if (rv.verdict !== 'changes_requested') {
      p.push('para devolver ao implementador, a revisão precisa ter verdict "changes_requested".');
    }
  }

  if (to === 'landed' && (!branchExists(b) || gitCode(['merge-base', '--is-ancestor', b, MAIN]) !== 0)) {
    p.push(`${b} ainda não está em ${MAIN}. Aterrissar é comando humano: /land-task ${t.id}.`);
  }

  if (['blocked', 'cancelled'].includes(to) && typeof opt.note !== 'string') p.push('diga o motivo com --note "…".');
  if (to === 'in_progress' && t.status === 'verified' && typeof opt.note !== 'string') p.push('reabrir tarefa verificada exige --note "motivo".');
  return p;
}

function allowedFrom(t) {
  if (t.status === 'blocked') return [t.blocked_from, 'cancelled'].filter(Boolean);
  return NEXT[t.status] ?? [];
}

// ------------------------------------------------------------ comandos
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');

function cmdNew() {
  requireMain('criar tarefa');
  const title = typeof opt.title === 'string' ? opt.title.replace(/"/g, "'") : '';
  const milestone = Number(opt.milestone);
  const type = opt.type ?? 'feature';
  if (!title) die('falta --title "…".');
  if (!Number.isInteger(milestone) || milestone < 0 || milestone > 9) die('falta --milestone N (0 a 9, ver docs/roadmap.md).');
  if (!AREAS.includes(opt.area)) die(`--area inválida. Use: ${AREAS.join(', ')}.`);
  if (!TYPES.includes(type)) die(`--type inválido. Use: ${TYPES.join(', ')}.`);
  const tasks = loadTasks();
  const deps = typeof opt.depends === 'string' ? opt.depends.split(',').map((s) => s.trim()).filter(Boolean) : [];
  for (const d of deps) findTask(tasks, d);
  const n = Math.max(0, ...tasks.map((t) => Number(String(t.id).slice(2)) || 0)) + 1;
  const id = `T-${String(n).padStart(4, '0')}`;
  const name = `${id}-${slugify(title) || 'tarefa'}`;
  const tplFile = path.join(BOARD, 'task-template.md');
  if (!fs.existsSync(tplFile)) die('docs/board/task-template.md não existe.', 'restaure o arquivo do kit.');
  const text = fs
    .readFileSync(tplFile, 'utf8')
    .replaceAll('{{ID}}', id)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{MILESTONE}}', String(milestone))
    .replaceAll('{{AREA}}', opt.area)
    .replaceAll('{{TYPE}}', type)
    .replaceAll('{{DEPENDS}}', deps.join(', '))
    .replaceAll('{{BRANCH}}', `${cfg.taskBranchPrefix}${name}`);
  fs.mkdirSync(TASKS, { recursive: true });
  fs.writeFileSync(path.join(TASKS, `${name}.md`), text);
  console.log(`${c.green('✔')} criada docs/board/tasks/${name}.md (backlog)`);
  console.log('  Preencha objetivo, escopo, critérios de aceite e verificação; depois `node scripts/task.mjs check`.');
}

function cmdList() {
  let tasks = loadTasks();
  if (typeof opt.status === 'string') tasks = tasks.filter((t) => t.status === opt.status);
  if (opt.milestone !== undefined) tasks = tasks.filter((t) => t.milestone === Number(opt.milestone));
  if (opt.json) {
    console.log(JSON.stringify(tasks.map(({ id, title, status, milestone, area, type, depends_on, branch }) => ({ id, title, status, milestone, area, type, depends_on, branch })), null, 2));
    return;
  }
  if (tasks.length === 0) return console.log('nenhuma tarefa.');
  for (const s of STATES) {
    const group = tasks.filter((t) => t.status === s);
    if (group.length === 0) continue;
    console.log(c.bold(`\n${s} (${group.length})`));
    for (const t of group) {
      const deps = t.depends_on.length ? c.dim(` ← ${t.depends_on.join(', ')}`) : '';
      console.log(`  ${t.id}  M${t.milestone}  ${String(t.area).padEnd(11)} ${t.title}${deps}`);
    }
  }
}

function cmdNext() {
  const tasks = loadTasks();
  const wip = tasks.filter((t) => WIP_STATES.includes(t.status));
  console.log(`em andamento: ${wip.length}/${cfg.wipLimit}${wip.length ? ` (${wip.map((t) => `${t.id}:${t.status}`).join(', ')})` : ''}`);
  const ready = tasks.filter((t) => t.status === 'ready');
  const free = ready.filter((t) => t.depends_on.every((d) => tasks.find((x) => x.id === d)?.status === 'landed'));
  if (free.length === 0) console.log('nenhuma tarefa pronta e desbloqueada.');
  for (const t of free) console.log(`  ${t.id}  M${t.milestone}  ${String(t.area).padEnd(11)} ${t.title}`);
  const waiting = ready.filter((t) => !free.includes(t));
  for (const t of waiting) console.log(c.dim(`  ${t.id}  aguardando ${t.depends_on.join(', ')}`));
  const approve = tasks.filter((t) => t.status === 'verified');
  if (approve.length) console.log(c.yellow(`aguardando o humano aterrissar: ${approve.map((t) => t.id).join(', ')} (/land-task <id>)`));
}

function cmdShow(id) {
  const tasks = loadTasks();
  const t = findTask(tasks, id);
  console.log(c.bold(`${t.id} — ${t.title}`));
  console.log(`arquivo: docs/board/tasks/${t.name}`);
  console.log(`estado: ${t.status} · marco ${t.milestone} · área ${t.area} · tipo ${t.type}`);
  console.log(`branch: ${t.branch}${branchExists(t.branch) ? '' : c.dim(' (ainda não existe)')}`);
  if (t.depends_on.length) console.log(`depende de: ${t.depends_on.join(', ')}`);
  for (const to of allowedFrom(t).filter((s) => !['blocked', 'cancelled', 'backlog'].includes(s))) {
    const p = gate(t, to, tasks);
    console.log(p.length ? c.yellow(`→ ${to}: falta`) : c.green(`→ ${to}: liberado`));
    for (const x of p) console.log(`    - ${x}`);
  }
  // Uma tarefa verificada pode deixar de valer: a branch mudou depois da revisão, ou main recebeu código.
  if (t.status === 'verified') {
    const p = gate({ ...t, status: 'review' }, 'verified', tasks);
    console.log(p.length ? c.red('as condições de "verified" deixaram de valer:') : c.green('as condições de "verified" continuam valendo.'));
    for (const x of p) console.log(`    - ${x}`);
    if (p.length) process.exitCode = 1;
  }
}

function cmdCheck() {
  const errs = validate(loadTasks());
  if (errs.length === 0) return console.log(c.green('✔ quadro: tarefas válidas'));
  for (const e of errs) console.error(c.red(`✖ ${e}`));
  console.error('  Como corrigir: ajuste o arquivo apontado; o formato está em docs/board/README.md.');
  process.exit(1);
}

function setKey(text, key, value) {
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(text)) return text.replace(re, `${key}: ${value}`);
  return text.replace(/^status:.*$/m, (m) => `${m}\n${key}: ${value}`);
}
const dropKey = (text, key) => text.replace(new RegExp(`^${key}:.*\\r?\\n`, 'm'), '');

const HINTS = {
  ready: () => 'Fila: `node scripts/task.mjs next`.',
  in_progress: (t) =>
    [
      'Agora crie o andar e ponha um implementador nele (confira as opções com `maestri floor --help`):',
      `    maestri floor create "${t.name.replace(/\.md$/, '')}" --branch ${t.branch}`,
      `  Sem Maestri: git worktree add ../${path.basename(ROOT)}-${t.id} -b ${t.branch}`,
      `  Primeira mensagem ao implementador: "Use a skill start-task para a ${t.id}."`,
    ].join('\n'),
  review: (t) => `Peça ao Revisor, em contexto limpo: "Use a skill review-task para a ${t.id}."`,
  verified: (t) => `Aguardando o humano: /land-task ${t.id}`,
  landed: (t) => `Remova o andar (o Teardown limpa) e apague a branch: git branch -d ${t.branch}`,
  blocked: () => 'Registre a pergunta em docs/open-questions.md se depender de decisão humana.',
};

function cmdMove(id, to) {
  requireMain('mover tarefa');
  if (opt.force === true) die('--force exige o motivo: --force "por quê".', 'só use com autorização humana explícita.');
  if (!STATES.includes(to)) die(`estado "${to ?? ''}" não existe.`, `use um de: ${STATES.join(', ')}.`);
  const tasks = loadTasks();
  const t = findTask(tasks, id);
  const from = t.status;
  const allowed = allowedFrom(t);
  const problems = allowed.includes(to)
    ? gate(t, to, tasks)
    : [`a transição ${from} → ${to} não existe. De "${from}" só se vai para: ${allowed.join(', ') || 'lugar nenhum (estado final)'}.`];

  if (problems.length && typeof opt.force !== 'string') {
    console.error(c.red(`✖ ${t.id} não pode ir de ${from} para ${to}:`));
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (opt['dry-run']) return console.log(c.green(`✔ ${t.id}: ${from} → ${to} liberado (simulação, nada gravado)`));

  let text = t.text.replace(/^status:.*$/m, `status: ${to}`);
  text = to === 'blocked' ? setKey(text, 'blocked_from', from) : dropKey(text, 'blocked_from');
  fs.writeFileSync(t.file, text);

  const forced = typeof opt.force === 'string' ? ` · FORÇADO: ${opt.force}${problems.length ? ` (pendências ignoradas: ${problems.length})` : ''}` : '';
  const note = typeof opt.note === 'string' ? ` · ${opt.note}` : '';
  const by = typeof opt.by === 'string' ? opt.by : 'maestro';
  fs.appendFileSync(path.join(BOARD, 'log.md'), `- ${new Date().toISOString()} · ${t.id} · ${from} → ${to} · ${by}${note}${forced}\n`);
  commitBoard(`board: ${t.id} ${from} → ${to}`);

  console.log(`${c.green('✔')} ${t.id}: ${from} → ${to}`);
  if (to === 'landed') {
    console.log(
      inheritStamp(t.branch)
        ? `  ${MAIN} tem exatamente o código verificado na branch: o térreo herdou a verificação.`
        : c.yellow(`  ${MAIN} difere do que foi verificado na branch: rode \`node scripts/verify.mjs --full\` no térreo.`),
    );
  }
  const hint = HINTS[to]?.({ ...t, status: to });
  if (hint) console.log(`  ${hint}`);
}

function cmdSync() {
  requireMain('gravar o quadro');
  const errs = validate(loadTasks());
  if (errs.length) {
    for (const e of errs) console.error(c.red(`✖ ${e}`));
    process.exit(1);
  }
  commitBoard(`board: ${typeof opt.note === 'string' ? opt.note : 'atualização'}`);
  console.log(c.green('✔ quadro gravado'));
}

switch (cmd) {
  case 'list': cmdList(); break;
  case 'next': cmdNext(); break;
  case 'show': cmdShow(arg1); break;
  case 'new': cmdNew(); break;
  case 'move': cmdMove(arg1, arg2); break;
  case 'check': cmdCheck(); break;
  case 'sync': cmdSync(); break;
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    console.log(`\nquadro: ${toPosix(path.relative(ROOT, BOARD))}`);
    process.exit(cmd ? 1 : 0);
}
