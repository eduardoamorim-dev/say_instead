#!/usr/bin/env node
// PreToolUse (Bash | PowerShell): barra ou pede confirmação para comandos que um agente não deve rodar sozinho.
// É cinto de segurança contra erro de agente, não sandbox: o padrão casa com o texto do comando.
import path from 'node:path';
import { git, guardsOff, loadConfig, matchAny, readHookInput, repoInfo } from '../../scripts/lib/util.mjs';

const input = await readHookInput();
if (guardsOff()) process.exit(0);
const cmd = String(input.tool_input?.command ?? '');
if (!cmd.trim()) process.exit(0);

const cfg = loadConfig();
const cwd = input.cwd || process.cwd();
const findings = [];
const hit = (decision, id, why, fix) => findings.push({ decision, id, why, fix });

// ------------------------------------------------------------ padrões sobre o texto
const HUMAN = 'peça ao humano; se ele autorizar, ele confirma na pergunta que aparece.';
const STATIC = [
  ['deny', 'push-force', /\bgit\b[^|;&\n]*\bpush\b[^|;&\n]*(\s--force(?!-with-lease)\b|\s-[a-zA-Z]*f[a-zA-Z]*(\s|$))/,
    'Force push reescreve histórico compartilhado.', 'corrija com um commit novo.'],
  ['ask', 'push-lease', /\bgit\b[^|;&\n]*\bpush\b[^|;&\n]*--force-with-lease/, 'Reescrever branch remota.', HUMAN],
  ['deny', 'no-verify', /\bgit\b[^|;&\n]*\b(commit|push|merge)\b[^|;&\n]*--no-verify\b/,
    'Pular verificações esconde o problema.', 'conserte a causa da falha.'],
  ['deny', 'publish', /\b(cargo|npm|pnpm|yarn)\s+publish\b/, 'Publicar pacote é irreversível e não faz parte do projeto.', 'não publique.'],
  ['deny', 'repo-delete', /\bgh\s+repo\s+(delete|archive)\b/, 'Apagar ou arquivar o repositório.', 'não faça isso.'],
  ['deny', 'guard-off', /HARNESS_GUARD\s*=/, 'Desligar os guardas é decisão humana.', 'trabalhe com os guardas ligados; se um guarda estiver errado, explique e pare.'],
  ['ask', 'release', /\bgh\s+(release\s+(create|upload|delete|edit)|secret\b|workflow\s+run|repo\s+(create|edit)|pr\s+merge)/,
    'Release, segredo, repositório e merge de PR são atos humanos.', HUMAN],
  ['ask', 'tag', /\bgit\s+tag\s+(-[a-zA-Z]+\s+)*v?\d/, 'Tag de versão dispara a release.', HUMAN],
  ['ask', 'pipe-shell', /\b(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(ba|z|da)?sh\b|\b(irm|iwr|Invoke-RestMethod|Invoke-WebRequest)\b[^|;\n]*\|\s*(iex|Invoke-Expression)\b/i,
    'Executar script baixado da internet.', HUMAN],
  ['ask', 'global-install', /\b(npm\s+(i|install|add)\s+(-g|--global)\b|npm\s+(-g|--global)\s+(i|install)\b|pnpm\s+(add|install|i)\s+(-g|--global)\b|cargo\s+install\b|winget\s+install\b|choco\s+install\b|scoop\s+install\b|rustup\s+(default|toolchain\s+install|self)\b|git\s+config\s+--(global|system)\b)/,
    'Instalação ou configuração global altera a máquina do usuário.', HUMAN],
  ['ask', 'destructive-git', /\bgit\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|branch\s+-D\b|stash\s+(drop|clear)\b|worktree\s+remove\b[^|;&\n]*--force)/,
    'Comando pode destruir trabalho não commitado ou não aterrissado.', HUMAN],
  ['ask', 'paid-api', /\b[A-Z][A-Z0-9_]*API_KEY\s*=|\$env:[A-Za-z0-9_]*API_KEY\s*=/, 'Usar chave de API pode gerar custo (princípio do custo zero).', HUMAN],
  ['ask', 'upload', /\b(curl|wget)\b(?![^|;&\n]*(localhost|127\.0\.0\.1))[^|;&\n]*\s(-d|--data[a-z-]*|-F|--form|-T|--upload-file)\b/,
    'Enviar dados para fora da máquina.', HUMAN],
  ['ask', 'task-force', /task\.mjs\b[^|;&\n]*--force\b/, 'Forçar transição do quadro ignora as pré-condições.', HUMAN],
  ['ask', 'harness-tamper', /(>>?|\btee\b|\bsed\s+-i|Set-Content|Out-File|Add-Content)[^|;&\n]*(\.claude[\\/](settings|hooks)|scripts[\\/]config)/,
    'Alterar o harness por linha de comando.', 'proponha a mudança ao humano; edição de guarda e de política passa por ele.'],
];
for (const [decision, id, re, why, fix] of STATIC) if (re.test(cmd)) hit(decision, id, why, fix);

// ------------------------------------------------------------ remoção recursiva de alvo perigoso
const unq = (s) => s.replace(/^["']|["']$/g, '');
const dangerous = (raw) => {
  const t = unq(raw);
  return (
    ['/', '~', '$HOME', '${HOME}', '.', '..', '*', '%USERPROFILE%', '$env:USERPROFILE'].includes(t.replace(/[\\/]+\*?$/, '') || '/') ||
    /^[A-Za-z]:[\\/]*\*?$/.test(t) ||
    /(^|[\\/])\.git[\\/]?$/.test(t)
  );
};
const parts = cmd.split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
for (const part of parts) {
  const tk = part.split(/\s+/);
  const head = tk[0].toLowerCase();
  const flags = tk.slice(1).filter((t) => /^-/.test(t) || /^\/[a-zA-Z]$/.test(t)).join(' ').toLowerCase();
  const targets = tk.slice(1).filter((t) => !/^-/.test(t) && !/^\/[a-zA-Z]$/.test(t));
  const unixRm = head === 'rm' && /(^|\s)-[a-z]*r|--recursive/.test(flags);
  const winRm = ['remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir'].includes(head) && /-r(ecurse)?\b|\/s\b/.test(flags);
  if ((unixRm || winRm) && targets.some(dangerous)) {
    hit('deny', 'rm-root', 'Remoção recursiva de raiz, home, pasta atual inteira ou .git.', 'apague só o caminho específico que precisa sair (ex.: `rm -rf target`).');
  }
}

// ------------------------------------------------------------ regras que dependem do estado do git
let dir = cwd;
for (const part of parts) {
  const cd = /^cd\s+(.+)$/.exec(part);
  if (cd) {
    dir = path.resolve(dir, unq(cd[1].trim()));
    continue;
  }
  const g = /^git\s+(.*)$/.exec(part);
  if (!g) continue;
  let rest = g[1];
  let gdir = dir;
  const dashC = /^-C\s+("[^"]+"|'[^']+'|\S+)\s+(.*)$/.exec(rest);
  if (dashC) {
    gdir = path.resolve(dir, unq(dashC[1]));
    rest = dashC[2];
  }
  const sub = (/^(?:-c\s+\S+\s+)*([a-z-]+)/.exec(rest) ?? [])[1];
  if (!['commit', 'merge', 'cherry-pick', 'rebase'].includes(sub)) continue;
  const info = repoInfo(gdir);
  if (!info || info.branch !== cfg.mainBranch) continue;

  if (sub === 'commit') {
    const all = /\s-[a-zA-Z]*a[a-zA-Z]*(\s|$)|\s--all\b/.test(rest);
    const files = [
      ...(git(['diff', '--cached', '--name-only'], info.top) ?? '').split(/\r?\n/),
      ...(all ? (git(['diff', '--name-only'], info.top) ?? '').split(/\r?\n/) : []),
    ].filter(Boolean);
    const product = files.filter((f) => matchAny(f, cfg.productPaths));
    if (product.length) {
      hit('deny', 'commit-main', `Commit de código de produto direto em ${cfg.mainBranch} (${product.slice(0, 3).join(', ')}${product.length > 3 ? '…' : ''}).`,
        `código entra por branch de tarefa (${cfg.taskBranchPrefix}T-NNNN-slug), revisão e aterrissagem. Tire esses arquivos do stage; em ${cfg.mainBranch} só docs, quadro e harness.`);
    }
  } else if (!/--(abort|continue|quit|skip)\b/.test(rest)) {
    hit('ask', 'land-main', `\`git ${sub}\` em ${cfg.mainBranch} é aterrissagem.`, 'aterrissar é comando humano (/land-task <id>); se foi ele quem pediu, ele confirma aqui.');
  }
}

// ------------------------------------------------------------ resposta
if (findings.length === 0) process.exit(0);
const decision = findings.some((f) => f.decision === 'deny') ? 'deny' : 'ask';
const reason = findings
  .filter((f) => f.decision === decision)
  .map((f) => `[harness:${f.id}] ${f.why} Como seguir: ${f.fix}`)
  .join(' | ');
process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } }),
);
