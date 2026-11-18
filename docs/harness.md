# Harness

O harness é tudo que fica em volta dos agentes para que o trabalho deles saia certo sem você conferir linha por linha: instruções, guardas, verificações e o quadro. Este arquivo explica cada peça e como mudá-la.

## Ideias que guiaram o desenho
1. **Mapa curto, verdade nos documentos.** O `CLAUDE.md` tem menos de cem linhas e aponta para `docs/`. Conhecimento de área fica em skills, que só carregam quando usadas.
2. **O que precisa acontecer sempre vira script, não frase.** Instrução em `CLAUDE.md` é conselho; hook e checagem são regra.
3. **Mensagem de erro ensina o conserto.** Toda falha diz a regra violada e o próximo passo, porque quem lê é um agente.
4. **O progresso mora em arquivos.** Tarefa, relatório, revisão e histórico estão no git. Uma sessão nova continua de onde a anterior parou.
5. **Quem faz não confere.** Revisão em contexto limpo, verificação por script, aterrissagem por humano.
6. **Erro repetido de agente é defeito do harness.** Corrige-se aqui, uma vez, para todas as sessões futuras.

## Peças

| Peça | Arquivo | Quando age | O que faz |
|---|---|---|---|
| Instruções | `CLAUDE.md`, `.claude/rules/*.md` | Início da sessão; regras por caminho ao abrir arquivo da área | Dá o mapa e as regras fixas |
| Skills | `.claude/skills/*/SKILL.md` | Sob demanda | Fluxos (`start-task`, `finish-task`, `review-task`, `plan-milestone`, `land-task`, `write-adr`, `spike`) e conhecimento por área |
| Subagentes | `.claude/agents/*.md` | Quando delegados | Revisão de código, arquitetura e segurança; pesquisa de documentação; verificação. Cada um em contexto próprio |
| Contexto inicial | `.claude/hooks/session-start.mjs` | SessionStart | Diz se é térreo ou andar, qual a tarefa e o estado da verificação |
| Guarda de comandos | `.claude/hooks/guard-bash.mjs` | Antes de Bash e PowerShell | Nega ou pede confirmação (tabela abaixo) |
| Guarda de arquivos | `.claude/hooks/guard-files.mjs` | Antes de Edit e Write | Protege segredos, quadro, código de produto em `main`, harness e ADR aceito |
| Portão de parada | `.claude/hooks/stop-gate.mjs` | Quando o agente vai encerrar o turno | Exige `verify` se há código alterado sem verificação |
| Verificação | `scripts/verify.mjs` | À mão, pelo portão e no CI | Quadro, custo zero, arquitetura, formatação, lint, testes; grava o carimbo |
| Arquitetura | `scripts/check-arch.mjs` + `config/arch-rules.json` | Dentro de `verify` | Regra de dependência entre crates e fronteira de import da interface |
| Custo zero | `scripts/check-zero-cost.mjs` + `config/policy.json` | Dentro de `verify` | Runner pago, segredo de API no CI, SDK de serviço pago |
| Quadro | `scripts/task.mjs` + `docs/board/` | Pelo Maestro | Máquina de estados com pré-condições |
| Autoteste | `scripts/selftest.mjs` | Em `verify --full` e no CI | Exercita guardas e scripts num repositório temporário |
| Ambiente | `scripts/doctor.mjs` | À mão | Diz o que falta instalar |
| Andares | `scripts/floor-*.mjs` | Hooks de andar do Maestri | Prepara, roda e limpa um andar |
| CI | `.github/workflows/ci.yml` | Push e pull request | `verify --full --check` em Windows |

## O carimbo de verificação
`verify` grava `.verify/stamp.json` com um hash do código verificado (os caminhos de `verifyPaths` em `scripts/config/harness.json`), o modo (`quick` ou `full`) e o resultado. O hash depende só do conteúdo desses caminhos: commitar não o altera, editar documentação ou relatório também não; editar código, teste, script ou configuração de build, sim.

- O portão de parada libera se o código no estado atual tem carimbo aprovado.
- `task.mjs` só leva uma tarefa para `review` se o topo da branch tem carimbo `full` aprovado.
- Ao aterrissar, se o código de `main` é idêntico ao verificado na branch, o térreo herda o carimbo; se difere, o portão exige nova verificação em `main`.

Com isso, "rodei os testes" deixa de ser afirmação do agente e passa a ser fato conferido.

## Guarda de comandos

| Decisão | Comandos |
|---|---|
| **Nega** | `git push --force`; `--no-verify` em commit, push e merge; `cargo`/`npm`/`pnpm publish`; `gh repo delete`; remoção recursiva de raiz, home, pasta atual ou `.git`; commit de código de produto em `main`; tentativa de desligar os guardas |
| **Pede confirmação** | `git merge`, `rebase` e `cherry-pick` em `main`; `gh release`, `gh secret`, `gh repo create`, `gh pr merge`; tag de versão; script baixado da internet; instalação global; `git reset --hard`, `git clean -f`, `git branch -D`; variável `*_API_KEY` no comando; envio de dados por `curl` para fora da máquina; `task.mjs --force`; escrita no harness por redirecionamento |

## Guarda de arquivos

| Decisão | Caminhos |
|---|---|
| **Nega** | `.env*`, `*.pem`, `*.key`, `*.pfx`, `.git/`; `crates/`, `src-tauri/`, `ui/`, `evals/` quando a branch é `main`; `docs/board/tasks/`, `docs/board/reviews/`, `docs/board/log.md` e `docs/roadmap.md` quando a branch não é `main` |
| **Pede confirmação** | `.claude/settings.json`, `.claude/hooks/`, `scripts/config/`, `.github/workflows/`, `docs/architecture.md`, `LICENSE`, ADR com `status: accepted` |

As listas ficam em `scripts/config/harness.json`.

## Limites, ditos com clareza
- **Os guardas são cinto de segurança, não cofre.** Casam com o texto do comando. Um agente que quisesse burlar conseguiria (por exemplo, com `sh -c`). Eles existem para pegar erro, não má-fé. Isolamento de verdade seria sandbox ou contêiner.
- **Só o Claude Code obedece aos hooks.** Um terminal com Codex ou Gemini no Maestri lê as regras escritas, mas não passa pelos guardas. Para esses, valem `verify` e o CI.
- **O hook falha aberto.** Se um script de guarda quebrar, o Claude Code segue sem ele. O autoteste no CI existe para que isso não passe despercebido. Em versão recente do Claude Code dá para inverter com `"onFailure": "block"` em `.claude/settings.json`.
- **Sandbox do Claude Code não existe no Windows nativo.** A página de instalação marca sandbox como "não suportado" no Windows nativo e "suportado" no WSL 2.
- **`verify` pula o que ainda não existe.** Antes do marco 0 quase tudo aparece como pulado; isso é esperado.

## Interruptor humano
Iniciar o Claude Code com a variável de ambiente `HARNESS_GUARD=off` desliga os três guardas naquela sessão. É para você, numa emergência. Agente que tentar usar é barrado.

## Como evoluir o harness
Quando um agente errar do mesmo jeito pela segunda vez, não corrija só o resultado. Pergunte o que faltou e ponha no lugar certo:

| O que faltou | Onde entra |
|---|---|
| Uma regra que vale sempre e cabe em uma linha | `CLAUDE.md` (e tire outra linha, para ele não crescer) |
| Uma regra de uma área só | `.claude/rules/<área>.md` com `paths:` |
| Conhecimento ou passo a passo | A skill da área |
| Algo que não pode acontecer nunca | Guarda (`guard-bash.mjs`, `guard-files.mjs`) com caso novo em `selftest.mjs` |
| Uma propriedade do código | Checagem em `check-arch.mjs` ou teste |
| Uma etapa pulada do fluxo | Pré-condição em `task.mjs` |

Mudança no harness passa por você: os arquivos são protegidos e o guarda pede confirmação. Depois de mudar, rode `node scripts/selftest.mjs`.

## Contrato com o projeto
`verify` espera, quando o código existir:
- `Cargo.toml` na raiz com o workspace; testes lentos marcados com `#[ignore]`; `deny.toml` para ligar o `cargo deny`.
- `package.json` na raiz com os scripts `lint`, `typecheck`, `test` (que roda uma vez e sai), `build:ui` e, quando houver tipos gerados, `bindings:check`. O script `dev` abre o app.
- `pnpm-lock.yaml` commitado.

## Fontes
- Claude Code: [boas práticas](https://code.claude.com/docs/en/best-practices.md), [hooks](https://code.claude.com/docs/en/hooks.md), [skills](https://code.claude.com/docs/en/skills.md), [subagentes](https://code.claude.com/docs/en/sub-agents.md), [memória e CLAUDE.md](https://code.claude.com/docs/en/memory.md), [permissões](https://code.claude.com/docs/en/permissions.md), [worktrees](https://code.claude.com/docs/en/worktrees.md), [instalação](https://code.claude.com/docs/en/setup.md). Lidas em 18/11/2026.
- Maestri: [documentação](https://www.themaestri.app/pt-br/docs/intro). Lida em 18/11/2026.
- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (26/11/2025).
- OpenAI, [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) (11/02/2026).

Os dois últimos foram localizados por busca em 18/11/2026; deles usei o que os resultados mostravam (agente inicializador, lista de tarefas e registro de progresso em arquivos; arquivo de instruções curto como mapa; restrições de arquitetura verificadas mecanicamente; mensagens de lint que ensinam o conserto). As páginas inteiras não foram relidas.
