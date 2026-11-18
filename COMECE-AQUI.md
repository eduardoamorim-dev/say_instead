# Comece aqui

Esta pasta é o ponto de partida do repositório do app. Ela traz tudo que os agentes precisam para construir o produto com método: instruções, guardas, verificação e um quadro de tarefas. O código do app ainda não existe; ele nasce das tarefas.

## O que você faz (uma vez)

**1. Extraia o zip num disco do Windows, com caminho curto, e renomeie a pasta para o nome do app.** Por exemplo `C:\dev\<nome-do-app>`. Os arquivos (`CLAUDE.md`, `BOOTSTRAP.md`, `.claude/`…) ficam direto dentro dela. Não use o WSL para este projeto: o app só compila no Windows, e no WSL os agentes verificariam um build de Linux. O motivo completo está em `maestri/MAESTRI_SETUP.md`.

**2. Instale o que falta no Windows.** Tudo gratuito. Os identificadores do winget abaixo são os usuais; `winget search <nome>` confirma.

| Ferramenta | Comando |
|---|---|
| Git for Windows | `winget install Git.Git` |
| Node LTS | `winget install OpenJS.NodeJS.LTS` |
| pnpm | `winget install pnpm.pnpm` |
| Rust | `winget install Rustlang.Rustup` e depois `rustup default stable` |
| Build Tools do Visual Studio (carga "Desenvolvimento para desktop com C++") | `winget install Microsoft.VisualStudio.2022.BuildTools` e escolha a carga no instalador |
| GitHub CLI (opcional) | `winget install GitHub.cli` e depois `gh auth login` |
| Claude Code | `winget install Anthropic.ClaudeCode` ou, no PowerShell, `irm https://claude.ai/install.ps1 \| iex` |

Depois, uma vez: `git config --global core.longpaths true`.

Para conferir: abra um terminal na pasta e rode `node scripts/doctor.mjs`.

**3. No Maestri:** crie um workspace apontando para a pasta, com ambiente **Local**. Abra um terminal com o Claude Code e, em Detalhes, marque **Maestro**.

**4. Escreva para ele:**

```
Leia BOOTSTRAP.md e execute.
```

**5. Responda às três perguntas** (nome, licença, GitHub), confirme o que os guardas perguntarem e faça os passos de interface que ele listar no fim (hooks de andar, notas, Partitura).

Sem o Maestri também funciona: abra o Claude Code na pasta e escreva a mesma frase. Ele pula a parte do Maestri e avisa.

## O que tem na pasta

| Onde | O quê |
|---|---|
| `BOOTSTRAP.md` | O roteiro que o primeiro agente executa |
| `CLAUDE.md` | O mapa que todo agente lê ao começar |
| `docs/architecture.md`, `docs/adr/` | A arquitetura condensada e as quinze decisões, uma por arquivo |
| `docs/roadmap.md` | Os dez marcos |
| `docs/workflow.md` | Papéis, estados da tarefa, portões |
| `docs/board/` | O quadro: cinco tarefas já escritas (marco 0 e o primeiro spike) |
| `docs/open-questions.md` | O que ainda é decisão sua e o que falta verificar |
| `docs/harness.md` | Como funcionam os guardas e como evoluí-los |
| `.claude/skills/` | Sete fluxos (planejar, começar, entregar, revisar, aterrissar, ADR, spike) e dez skills de área |
| `.claude/agents/` | Cinco subagentes: três revisores, um pesquisador de documentação, um verificador |
| `.claude/hooks/`, `.claude/settings.json` | Guardas de comando e de arquivo, portão de parada, contexto de início |
| `scripts/` | `verify`, `task`, `check-arch`, `check-zero-cost`, `selftest`, `doctor`, hooks de andar |
| `maestri/` | A estrutura recomendada no Maestri e as três Responsabilidades |
| `.github/workflows/ci.yml` | A mesma verificação, no GitHub Actions |

## Como é o dia a dia depois

1. Você diz ao Maestro o que quer: "inicie a T-0001", "planeje o marco 1".
2. Ele abre um andar, põe um Implementador, acompanha, pede revisão.
3. Você é chamado em quatro momentos: aprovar um plano, aceitar um ADR, confirmar uma pergunta de guarda, aterrissar (`/land-task T-0001`).

## O que eu não consegui verificar daqui

Dito sem rodeio, para você saber onde olhar primeiro:

- **Os scripts e os guardas foram testados em Linux**, com Node 22, git, cargo e pnpm. O autoteste do kit passa (80 verificações), e simulei o ciclo inteiro de uma tarefa com um workspace Rust de verdade: abrir, implementar num worktree dentro de `.maestri/floors/`, verificar, relatar, revisar, aterrissar, limpar. No Windows nada disso rodou ainda. Os scripts foram escritos para serem portáteis (Node puro, sem depender de shell), mas a primeira execução de `node scripts/selftest.mjs` na sua máquina é a prova.
- **Os hooks não rodaram dentro de uma sessão real do Claude Code.** Testei cada um alimentando a entrada no formato que a documentação descreve, e o `claude doctor` (versão 2.1.327) leu o `.claude/settings.json` sem apontar erro. O `BOOTSTRAP.md` manda o agente conferir que o guarda dispara de verdade.
- **O Maestri não foi usado.** A estrutura segue a documentação lida em 18/11/2026. Ela não documenta o formato dos arquivos de Responsabilidade e de Partitura, nem os limites do plano gratuito para andares e bandas; por isso essas partes ficam com o agente Maestro (pela CLI) e com você (pela interface), e há quatro conferências listadas em `maestri/MAESTRI_SETUP.md`.
- **As versões das actions do CI** precisam ser conferidas e fixadas por SHA; isso é critério da tarefa T-0004.
- **As skills de área resumem a arquitetura**, não a API das bibliotecas. De propósito: elas mandam o agente consultar a documentação atual antes de escrever, porque Tauri, sherpa-onnx e o protocolo ACP mudam.
