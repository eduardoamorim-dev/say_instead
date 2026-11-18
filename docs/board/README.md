# Quadro

O quadro é feito de arquivos. Quem lê o repositório sabe o que está pronto, o que está em andamento e o que falta, sem depender de ferramenta externa nem da memória de uma sessão.

```
docs/board/
  tasks/T-NNNN-slug.md     especificação da tarefa (o Maestro escreve, em main)
  reports/T-NNNN.md        relatório de entrega (o Implementador escreve, na branch da tarefa)
  reviews/T-NNNN.md        veredito da revisão (o Revisor escreve, em main)
  log.md                   histórico de transições (o script escreve)
  task-template.md         molde usado por `task.mjs new`
```

Três autores, três pastas, nenhuma sobreposição: é isso que evita conflito de merge entre o térreo e os andares.

## Comandos
```
node scripts/task.mjs list                      # tudo, por estado
node scripts/task.mjs next                      # o que pode começar agora
node scripts/task.mjs show T-0001               # estado e o que falta para a próxima transição
node scripts/task.mjs new --title "…" --milestone 1 --area speech [--type spike] [--depends T-0001]
node scripts/task.mjs move T-0001 ready         # recusa se a pré-condição não estiver cumprida
node scripts/task.mjs check                     # valida todos os arquivos
node scripts/task.mjs sync --note "…"           # grava mudanças de especificação
```
`new`, `move` e `sync` só funcionam em `main`. Estados e pré-condições estão em `docs/workflow.md`.

## Cabeçalho da tarefa
```yaml
id: T-0007                      # T-NNNN, igual ao começo do nome do arquivo
title: "Decodificar MP4 com Symphonia"
milestone: 1                    # 0 a 9, ver docs/roadmap.md
area: speech                    # foundation, domain, application, speech, storage, providers,
                                # knowledge, analysis, shell, ui, release, harness, docs
type: feature                   # feature, spike, chore, bug
status: backlog                 # só o script muda
depends_on: [T-0003]
branch: task/T-0007-decodificar-mp4-com-symphonia
```

## O que faz uma boa tarefa
- **Cabe em uma sessão de trabalho.** Se a descrição do diff não cabe em um parágrafo, é mais de uma tarefa.
- **É autocontida.** Cita os arquivos e interfaces envolvidos, os ADRs e as skills a carregar. Aponta, não copia.
- **Diz o que fica de fora.** O Implementador não decide o escopo.
- **Tem critérios verificáveis.** "Funciona bem" não é critério. "O teste `decode_mp4_aac` passa com o arquivo `fixtures/curto.mp4`" é.
- **Termina com verificação de ponta a ponta.** Um comando ou uma observação que prova que a coisa existe.
- **Uma área por tarefa**, quando der. Backend antes de frontend.

## Relatório de entrega (`reports/T-NNNN.md`)
```markdown
# T-NNNN — título

## Resumo
O que mudou, em três a seis linhas.

## Critérios de aceite
| Critério | Atendido | Evidência |
|---|---|---|
| … | sim / não / parcial | teste, comando e saída, ou arquivo:linha |

## Verificação
Comando rodado e resultado (`node scripts/verify.mjs --full`: OK, carimbo abc123…).

## Decisões tomadas
O que foi escolhido dentro do escopo e por quê. Nada que contrarie ADR.

## Descobertas
O que apareceu e ficou de fora: dívidas, bugs vizinhos, tarefas sugeridas, dúvidas.

## Como testar à mão
Passos, quando fizer sentido.
```

## Veredito da revisão (`reviews/T-NNNN.md`)
```markdown
---
task: T-NNNN
commit: <sha do topo da branch revisada>
verdict: approved            # ou changes_requested
reviewer: revisor
date: 2026-11-18
---

## Bloqueadores
Só o que afeta correção, requisito, arquitetura ou segurança. Cada item com arquivo:linha e o que se espera.

## Sugestões
Opcionais. Não impedem a aprovação.

## O que foi conferido
Critérios, arquitetura, segurança, verificação rodada.
```
