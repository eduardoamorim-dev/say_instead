#!/usr/bin/env node
// Stop: não deixa o agente encerrar o turno com código alterado e não verificado.
// Bloqueia uma vez por parada (respeita stop_hook_active), então nunca prende o agente em laço.
import { codeHash, git, guardsOff, loadConfig, matchAny, readHookInput, readStamp, repoInfo, workingTreeHash } from '../../scripts/lib/util.mjs';

const input = await readHookInput();
if (guardsOff() || input.stop_hook_active) process.exit(0);

const info = repoInfo(input.cwd || process.cwd());
if (!info) process.exit(0);
if (git(['rev-parse', '--verify', '-q', 'HEAD'], info.top) === null) process.exit(0); // repositório sem commits

const cfg = loadConfig();
const tree = workingTreeHash(info.top);
if (!tree) process.exit(0);

const stamp = readStamp(info.top);
const code = codeHash(tree, info.top, cfg.verifyPaths);
if (stamp?.ok && stamp.code === code) process.exit(0); // o código atual já foi verificado

// Base da comparação: último estado verificado; senão, o ponto em que a branch saiu da principal.
let base = null;
if (stamp?.ok && stamp.tree && git(['cat-file', '-e', `${stamp.tree}^{tree}`], info.top) !== null) base = stamp.tree;
if (!base) {
  const fork = info.branch === cfg.mainBranch ? null : git(['merge-base', 'HEAD', cfg.mainBranch], info.top);
  base = git(['rev-parse', `${fork ?? 'HEAD'}^{tree}`], info.top);
}
if (!base) process.exit(0);

const changed = (git(['diff', '--name-only', base, tree], info.top) ?? '')
  .split(/\r?\n/)
  .filter((f) => f && matchAny(f, cfg.verifyPaths));
if (changed.length === 0) process.exit(0);

const sample = `${changed.slice(0, 5).join(', ')}${changed.length > 5 ? `, … (+${changed.length - 5})` : ''}`;
const reason =
  stamp && !stamp.ok && stamp.code === code
    ? `A última verificação FALHOU para o estado atual (${sample}). Leia .verify/logs/, corrija a causa e rode \`node scripts/verify.mjs --quick\` de novo. Se está bloqueado, diga exatamente o que falha e o que já tentou, e então pare.`
    : `Há código alterado sem verificação (${sample}). Rode \`node scripts/verify.mjs --quick\` e corrija o que falhar antes de encerrar. Se você parou só para fazer uma pergunta, repita a pergunta e pare.`;

process.stdout.write(JSON.stringify({ decision: 'block', reason: `[harness:stop-gate] ${reason}` }));
