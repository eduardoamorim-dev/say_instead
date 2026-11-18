# BOOTSTRAP — instruções para o primeiro agente

Você é o primeiro agente a abrir este projeto. Esta pasta contém um kit de orquestração: instruções, guardas, scripts e um quadro de tarefas para construir um app de desktop com vários agentes. Sua missão agora é **ligar o kit**, não construir o app.

Siga as etapas na ordem. Em cada uma, faça, confira o resultado e só então avance. Se algo falhar, pare e mostre ao humano o erro exato; não improvise um desvio.

## Regras desta sessão
- **Não escreva código de produto** (`crates/`, `src-tauri/`, `ui/`, `evals/`). Isso é trabalho das tarefas do quadro, depois.
- **Pergunte só o que está listado na etapa 2.** O resto já foi decidido e está em `docs/`.
- **Não instale nada na máquina** sem o humano confirmar. Os guardas vão pedir confirmação em alguns comandos (`gh repo create`, escrever `LICENSE`): é esperado; explique antes o que vai fazer.
- **Não invente sintaxe** da CLI do Maestri: use `maestri --help` e a skill `/maestri-manager`.
- **Pode ser retomado:** se `scripts/config/project.json` já tem `"initialized": true`, descubra em que etapa parou (`git log --oneline`, `git status`) e continue dali.

## Etapa 0 — Ler
Leia, nesta ordem: `CLAUDE.md`, `docs/workflow.md`, `docs/harness.md`, `maestri/MAESTRI_SETUP.md`. Passe os olhos em `docs/architecture.md` e `docs/roadmap.md` para saber o que será construído.

## Etapa 1 — Conferir o ambiente
```
node scripts/doctor.mjs
```
- Item com ✖: mostre ao humano o comando sugerido e espere ele instalar. Rode de novo até não haver ✖.
- Aviso de sistema que não é Windows, ou pasta dentro do WSL: **pare**. O app só compila no Windows nativo. Explique isso (seção "Windows nativo, não WSL" de `maestri/MAESTRI_SETUP.md`) e pergunte se ele quer mover a pasta para um disco do Windows antes de continuar. Seguir no WSL só serve para preparar o repositório; nenhuma tarefa de código poderá ser verificada lá.
- Avisos com `!` não bloqueiam: liste-os no relatório final.

## Etapa 2 — Perguntar ao humano
Faça estas perguntas de uma vez (use a ferramenta de perguntas, se tiver):

1. **Nome do app** (como aparece para o usuário) e **nome do repositório** (minúsculas e hífens).
2. **Licença do código.** Opções: Apache-2.0 (sugerida na arquitetura), MIT, GPL-3.0. Precisa ser aprovada pela OSI, por causa da rota de assinatura gratuita (ADR-0015).
3. **GitHub:** usuário ou organização dona do repositório; criar o repositório agora ou depois; público ou privado. Diga a consequência: o CI em runner padrão é gratuito em repositório público; em privado há cota mensal.

Não pergunte mais nada. As outras decisões em aberto estão em `docs/open-questions.md`, com o marco em que cada uma passa a bloquear.

## Etapa 3 — Gravar a identidade do projeto
```
node scripts/init.mjs --name "<nome do app>" --slug <nome-do-repositorio> --owner <usuario> --license <SPDX>
```
Confira que `{{APP_NAME}}` sumiu de `CLAUDE.md`, `README.md`, `docs/architecture.md` e `docs/roadmap.md`.

## Etapa 4 — Repositório git
```
git rev-parse --is-inside-work-tree      # se falhar: git init -b main
git branch --show-current                # precisa ser main
```
**Licença.** Com o `gh` autenticado, o texto oficial vem da API do GitHub (a chave é o identificador em minúsculas, por exemplo `apache-2.0`, `mit`, `gpl-3.0`):
```
gh api licenses/<chave> --jq .body > LICENSE
```
Sem `gh`, peça ao humano que coloque o arquivo `LICENSE`. Não escreva texto de licença de memória.

Primeiro commit:
```
git add -A
git status --short                       # confira: nada de .env, chave, modelo ou áudio
git commit -m "chore: kit de orquestração de agentes"
```

## Etapa 5 — Provar que o harness funciona
```
node scripts/selftest.mjs
node scripts/verify.mjs --full
node scripts/task.mjs list
```
- O autoteste precisa passar inteiro. Se falhar, **pare**: um guarda quebrado é pior que nenhum. Mostre a falha ao humano.
- `verify` vai mostrar quase tudo como "pulado": o código do app ainda não existe. Precisa terminar em `OK`.
- `list` precisa mostrar cinco tarefas no backlog (T-0001 a T-0005).

Confira também que os guardas estão ativos nesta sessão, tentando criar um arquivo qualquer dentro de `crates/`: o guarda deve negar, porque você está em `main`. Se não negar, os hooks de `.claude/settings.json` não carregaram: peça ao humano que reinicie a sessão e rode `/hooks`.

## Etapa 6 — GitHub (só se o humano pediu para criar agora)
```
gh auth status
gh repo create <owner>/<slug> --<public|private> --source . --remote origin --push
```
O guarda pede confirmação: é o humano autorizando a criação. Depois, confira a primeira execução do CI (`gh run list --limit 1`). Ela precisa ficar verde; se não ficar, mostre o log.

Se ele preferiu criar depois, anote isso no relatório final: a tarefa T-0004 (CI) depende do repositório no GitHub.

## Etapa 7 — Montar o Maestri
Siga a **parte B** de `maestri/MAESTRI_SETUP.md`: reconhecer a CLI, criar as três Responsabilidades a partir de `maestri/roles/`, recrutar o Revisor, criar a banda.

Se o comando `maestri` não existir neste terminal, você não está dentro do Maestri: pule a parte B e diga ao humano, no relatório final, que ela ficou por fazer.

O que só a interface do Maestri faz (parte A: hooks de andar, notas, Partitura) é do humano. Liste para ele, com os comandos exatos.

## Etapa 8 — Apresentar o plano do marco 0
As tarefas T-0001 a T-0004 (marco 0, Fundação) e o spike T-0005 já estão escritos, no backlog. Leia os cinco arquivos em `docs/board/tasks/` e apresente ao humano:
- uma tabela com id, título, depende de, e o critério principal;
- a ordem sugerida: T-0001 e T-0005 podem começar em paralelo (dois andares); depois T-0002; depois T-0003 e T-0004 em paralelo;
- o que cada uma vai pedir dele (por exemplo, a T-0004 precisa do repositório no GitHub; a T-0002 propõe um ADR).

Pergunte se ele aprova, quer ajustar ou quer replanejar com a skill `plan-milestone`. **Só depois da aprovação:**
```
node scripts/task.mjs move T-0001 ready
node scripts/task.mjs move T-0002 ready
node scripts/task.mjs move T-0003 ready
node scripts/task.mjs move T-0004 ready
node scripts/task.mjs move T-0005 ready
```
Não mova nada para `in_progress` nesta sessão, a menos que ele peça.

## Etapa 9 — Arrumar a casa
```
mkdir -p docs/kit
git mv BOOTSTRAP.md docs/kit/BOOTSTRAP.md
git mv COMECE-AQUI.md docs/kit/COMECE-AQUI.md
git commit -m "docs: arquiva as instruções de partida"
```
Se há remoto, `git push`.

## Etapa 10 — Relatório final ao humano
Curto, nesta ordem:
1. **Feito:** identidade do projeto, repositório, autoteste e verificação (com o resultado), GitHub, Maestri.
2. **Ficou para você:** os itens da parte A de `maestri/MAESTRI_SETUP.md` que faltam, com os comandos; as conferências H1 a H4; os avisos do `doctor`.
3. **Não verificado:** o que você não conseguiu conferir, dito com clareza.
4. **Como começar:** "Diga ao Maestro: *inicie a T-0001*." (Se este terminal é o Maestro, você mesmo segue o ciclo da Responsabilidade Maestro quando ele mandar.)

Depois disso, pare. A partir daqui, o trabalho segue `docs/workflow.md`.
