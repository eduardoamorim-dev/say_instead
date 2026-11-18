#!/usr/bin/env node
// SessionStart: diz ao agente onde ele está (térreo ou andar), qual é a tarefa e o estado da verificação.
// O texto impresso entra no contexto da sessão; por isso é curto.
import fs from 'node:fs';
import path from 'node:path';
import { codeHash, git, loadConfig, parseFrontmatter, readHookInput, readJson, readStamp, repoInfo, workingTreeHash } from '../../scripts/lib/util.mjs';

const input = await readHookInput();
const lines = [];
const done = () => {
  console.log(lines.join('\n'));
  process.exit(0);
};

const info = repoInfo(input.cwd || process.cwd());
if (!info) {
  lines.push('[harness] Esta pasta ainda não é um repositório git. Primeiro uso: leia BOOTSTRAP.md e execute.');
  done();
}

const cfg = loadConfig();
const project = readJson(path.join(info.top, 'scripts/config/project.json'), {});
if (!project.initialized && fs.existsSync(path.join(info.top, 'BOOTSTRAP.md'))) {
  lines.push('[harness] Projeto ainda não inicializado: leia BOOTSTRAP.md e execute antes de qualquer outra coisa.');
}

const tasksDir = path.join(info.top, 'docs/board/tasks');
const taskFiles = fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir).filter((f) => /^T-\d{4}-.+\.md$/.test(f)) : [];

if (info.branch === cfg.mainBranch) {
  lines.push(`[harness] Você está no TÉRREO (branch ${cfg.mainBranch}): aqui só documentação, quadro e harness. Código de produto só em branch de tarefa; os guardas bloqueiam o resto.`);
  const count = {};
  for (const f of taskFiles) {
    const { data } = parseFrontmatter(fs.readFileSync(path.join(tasksDir, f), 'utf8'));
    (count[data.status] ??= []).push(data.id);
  }
  const part = (s, label) => (count[s]?.length ? `${count[s].length} ${label} (${count[s].join(', ')})` : null);
  const summary = [part('in_progress', 'em andamento'), part('review', 'em revisão'), part('verified', 'aguardando aterrissagem'), part('ready', 'prontas'), part('backlog', 'no backlog')].filter(Boolean);
  if (summary.length) lines.push(`[harness] Quadro: ${summary.join(' · ')}. Fila: \`node scripts/task.mjs next\`.`);
} else {
  const id = (new RegExp(`^${cfg.taskBranchPrefix.replace(/[/]/g, '\\/')}(T-\\d{4})-`).exec(info.branch) ?? [])[1];
  const file = id && taskFiles.find((f) => f.startsWith(`${id}-`));
  if (file) {
    const rel = `docs/board/tasks/${file}`;
    const onMain = git(['show', `${cfg.mainBranch}:${rel}`], info.top);
    const status = onMain ? parseFrontmatter(onMain).data.status : 'desconhecido';
    lines.push(`[harness] Você está no ANDAR da tarefa ${id} (branch ${info.branch}). Especificação: ${rel}. Estado no quadro: ${status}.`);
    lines.push('[harness] Comece pela skill start-task e termine pela finish-task. O quadro (docs/board/tasks) não se edita daqui.');
  } else {
    lines.push(`[harness] Branch "${info.branch}" sem tarefa correspondente (padrão: ${cfg.taskBranchPrefix}T-NNNN-slug). Confirme com o Maestro qual tarefa é esta antes de mexer em código.`);
  }
  const stamp = readStamp(info.top);
  const code = codeHash(workingTreeHash(info.top), info.top, cfg.verifyPaths);
  if (stamp && code && stamp.code === code) lines.push(`[harness] Verificação do estado atual: ${stamp.ok ? 'OK' : 'FALHOU'} (${stamp.mode}).`);
  else lines.push('[harness] O código no estado atual ainda não foi verificado.');
}

lines.push('[harness] Antes de encerrar com código alterado: `node scripts/verify.mjs --quick`. Se a melhor solução contraria um ADR ou docs/architecture.md, pare e avise antes de implementar.');
done();
