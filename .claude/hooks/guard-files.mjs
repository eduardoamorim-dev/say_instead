#!/usr/bin/env node
// PreToolUse (Edit | Write | NotebookEdit): protege arquivos por caminho e por branch.
//   - segredos e .git: nunca
//   - branch principal (térreo): nada de código de produto
//   - branch de tarefa (andar): nada de quadro
//   - harness, política, arquitetura e ADR aceito: só com confirmação humana
import fs from 'node:fs';
import path from 'node:path';
import { guardsOff, loadConfig, matchAny, parseFrontmatter, readHookInput, relTo, repoInfo, toPosix } from '../../scripts/lib/util.mjs';

const input = await readHookInput();
if (guardsOff()) process.exit(0);
const ti = input.tool_input ?? {};
const raw = ti.file_path ?? ti.notebook_path;
if (!raw) process.exit(0);

const answer = (decision, id, why, fix) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: `[harness:${id}] ${why} Como seguir: ${fix}`,
      },
    }),
  );
  process.exit(0);
};

const abs = path.resolve(input.cwd || process.cwd(), raw);
if (/(^|\/)\.git\//.test(toPosix(abs))) answer('deny', 'git-dir', 'Editar dentro de .git corrompe o repositório.', 'use comandos git.');

const info = repoInfo(abs);
if (!info) process.exit(0);
const rel = relTo(info.top, abs);
if (rel === null) process.exit(0);

const cfg = loadConfig();
const onMain = info.branch === cfg.mainBranch;

const secret = matchAny(rel, cfg.protected.deny);
if (secret) answer('deny', 'secret', `"${rel}" casa com "${secret}": arquivo de segredo ou interno.`, 'segredos ficam fora do repositório (cofre do sistema, segredo do CI). Peça ao humano.');

if (onMain && matchAny(rel, cfg.productPaths)) {
  answer('deny', 'product-on-main', `"${rel}" é código de produto e você está em ${cfg.mainBranch} (térreo).`,
    `trabalhe no andar da tarefa (branch ${cfg.taskBranchPrefix}T-NNNN-slug). Se não há tarefa para isso, peça ao Maestro que crie uma.`);
}

if (!onMain && matchAny(rel, cfg.boardPaths)) {
  answer('deny', 'board-off-main', `"${rel}" é do quadro, que só muda em ${cfg.mainBranch} (térreo).`,
    'registre o que fez em docs/board/reports/<id>.md e avise o Maestro; quem move tarefa é ele, com scripts/task.mjs.');
}

if (/^docs\/adr\/\d{4}-.+\.md$/.test(rel) && fs.existsSync(abs)) {
  const { data } = parseFrontmatter(fs.readFileSync(abs, 'utf8'));
  if (data.status === 'accepted') {
    answer('ask', 'adr-immutable', `"${rel}" é um ADR aceito, e ADR aceito não se reescreve.`,
      'crie um ADR novo que o substitua (skill write-adr); no antigo só muda o status para "superseded by NNNN".');
  }
}

const guarded = matchAny(rel, cfg.protected.ask);
if (guarded) {
  answer('ask', 'harness-change', `"${rel}" faz parte do harness, da política ou da arquitetura (${guarded}).`,
    'explique ao humano o que quer mudar e por quê; ele confirma aqui. Mudança de arquitetura pede ADR.');
}
process.exit(0);
