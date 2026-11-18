# Fluxo de trabalho

Como uma ideia vira código em `main`. Vale para humano e para agente.

## Papéis

| Papel | Onde trabalha | Faz | Não faz |
|---|---|---|---|
| **Humano** (você) | Qualquer lugar | Aprova plano de marco, ADR e aterrissagem; responde às perguntas dos guardas | — |
| **Maestro** | Térreo (`main`) | Fatia marcos em tarefas, cuida do quadro, cria andares, distribui trabalho, pede revisão | Código de produto; aterrissar sem ordem humana |
| **Implementador** | Um andar (branch `task/T-NNNN-slug`) | Uma tarefa: código, testes, relatório | Mexer no quadro; sair do escopo; mudar arquitetura |
| **Revisor** | Térreo, em contexto limpo | Revisa o diff contra a especificação; escreve o veredito | Corrigir o código que revisa |

Um agente nunca revisa o próprio trabalho. O Revisor não viu o raciocínio de quem implementou: ele vê a especificação, o relatório e o diff.

## Estados da tarefa

```
backlog ──► ready ──► in_progress ──► review ──► verified ──► landed
                          ▲              │           │
                          └──────────────┴───────────┘   (mudanças pedidas / reaberta)
qualquer estado não final ──► blocked ──► volta de onde saiu      ──► cancelled
```

Quem move é o Maestro, em `main`, com `node scripts/task.mjs move <id> <estado>`. O script recusa a transição se a pré-condição não estiver cumprida e diz o que falta.

| Transição | Pré-condição verificada pelo script | Quem dispara |
|---|---|---|
| backlog → ready | Especificação completa: objetivo, fora de escopo, critérios de aceite (`- [ ]`), verificação | Maestro, depois de o humano aprovar o plano |
| ready → in_progress | Dependências aterrissadas; limite de trabalho em andamento não estourado | Maestro, ao criar o andar |
| in_progress → review | Branch existe; relatório `docs/board/reports/<id>.md` commitado nela; o topo da branch tem `verify --full` aprovado; a branch não está atrás de `main` em código | Maestro, quando o Implementador avisa |
| review → verified | Revisão `docs/board/reviews/<id>.md` com `verdict: approved` para o commit do topo da branch | Maestro, quando o Revisor avisa |
| review → in_progress | Revisão com `verdict: changes_requested` | Maestro |
| verified → landed | A branch está em `main` | Humano, com `/land-task <id>` |
| → blocked / cancelled | `--note` com o motivo | Maestro |

`--force "motivo"` pula as pré-condições e fica registrado em `docs/board/log.md`. Só com ordem humana; o guarda pede confirmação.

## Ciclo de uma tarefa
1. **Planejar.** `plan-milestone`: o Maestro lê o roteiro, a arquitetura e as pendências, propõe as tarefas e mostra ao humano. Aprovado, move para `ready`.
2. **Abrir.** O Maestro move para `in_progress`, cria o andar com a branch da tarefa e põe um Implementador nele.
3. **Implementar.** `start-task`: ler a especificação e o contexto, confirmar que nada contraria um ADR, fazer em passos pequenos com teste, rodar `verify` com frequência.
4. **Entregar.** `finish-task`: relatório com evidência por critério, `verify --full` verde, commit, aviso ao Maestro.
5. **Revisar.** `review-task`: o Revisor confere critérios, arquitetura e segurança, roda a verificação e escreve o veredito. Só bloqueia por correção, requisito, arquitetura ou segurança.
6. **Aterrissar.** `/land-task`: comando humano. Merge em `main`, verificação, tarefa em `landed`, andar removido.

## Portões automáticos
- **Guarda de arquivos:** em `main` não se edita código de produto; em branch de tarefa não se edita o quadro; harness, política, arquitetura e ADR aceito pedem confirmação humana.
- **Guarda de comandos:** barra force push, `--no-verify`, publicação e remoção perigosa; pede confirmação para merge em `main`, release, instalação global e uso de chave de API.
- **Portão de parada:** o agente não encerra o turno com código alterado e não verificado.
- **Checagens em `verify`:** quadro válido, custo zero, regra de dependência, formatação, lint, testes.
- **CI:** a mesma verificação, em máquina limpa.

Detalhes em `docs/harness.md`.

## Quando parar e perguntar
- A tarefa pede algo que contraria um ADR, um princípio ou `docs/architecture.md`.
- A especificação é ambígua em algo que muda o resultado.
- Uma verificação pendente de `docs/open-questions.md` bloqueia o caminho.
- A mesma falha persiste depois de duas tentativas com abordagens diferentes.
- Seria preciso instalar algo na máquina, gastar dinheiro ou tocar em segredo.

Parar com uma pergunta clara vale mais do que entregar um palpite.

## Sem o Maestri
O fluxo é o mesmo com git puro: `git worktree add ../<repo>-T-0001 -b task/T-0001-slug` no lugar do andar, uma sessão do Claude Code em cada pasta, e você no papel de quem leva os avisos de um para o outro.
