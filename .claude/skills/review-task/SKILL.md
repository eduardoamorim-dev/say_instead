---
name: review-task
description: "Revisa uma tarefa entregue, em contexto limpo: confere critérios, arquitetura e segurança, roda a verificação e escreve o veredito em docs/board/reviews. Use no térreo (branch main), no papel de Revisor, quando o Maestro pedir a revisão de uma tarefa em estado review."
argument-hint: "<T-NNNN>"
---

# Revisar uma tarefa

Tarefa: $ARGUMENTS

Você é o Revisor. Você não implementou isto e não vai consertar: você diz se pode aterrissar e, se não pode, exatamente por quê.

Antes de começar, o contexto precisa estar limpo. Se esta sessão já revisou outra tarefa ou ajudou nesta, peça ao humano um `/clear` e recomece.

## 1. Reunir o material
```
node scripts/task.mjs show <id>            # estado, branch
git worktree list                          # onde está o andar da branch
git log --oneline main..<branch>
git diff main...<branch> --stat
git show <branch>:docs/board/reports/<id>.md
```
Leia a especificação (`docs/board/tasks/<id>-*.md`) antes do relatório, para formar a sua expectativa sem a versão de quem implementou.

## 2. Rodar a verificação você mesmo
Na pasta do andar:
```
cd <pasta do andar> && node scripts/verify.mjs --full --check
```
`--check` não altera arquivo. Se falhar, já é bloqueador: não precisa continuar a revisão fina.

## 3. Revisar em paralelo, com subagentes
Dispare ao mesmo tempo, passando o id e a branch:
- `code-reviewer`: sempre.
- `arch-reviewer`: se o diff toca `crates/`, `src-tauri/`, IPC, dependências ou `scripts/config/`.
- `security-reviewer`: se toca `src-tauri/`, `providers`, `storage`, `knowledge`, download de arquivo ou exibição de texto de modelo.

Cada um devolve bloqueadores e sugestões. Você decide o que entra no veredito.

## 4. Julgar os achados
- **Bloqueador** é só o que afeta correção, requisito declarado, arquitetura (regra ou ADR) ou segurança.
- Estilo, preferência e "eu faria diferente" são sugestão, no máximo.
- Confira você mesmo cada bloqueador antes de registrá-lo: abra o arquivo, leia a linha. Subagente que procura problema tende a encontrar um; descarte o que não se sustenta.
- Critério de aceite sem evidência no código ou nos testes é bloqueador, mesmo que o relatório diga "feito".
- Mudança fora do escopo: bloqueador se altera comportamento; sugestão se é só ruído.

## 5. Escrever o veredito
Crie `docs/board/reviews/<id>.md` (substitui o anterior, se houver):

```markdown
---
task: <id>
commit: <sha completo do topo da branch: git rev-parse <branch>>
verdict: approved | changes_requested
reviewer: revisor
date: <AAAA-MM-DD>
---

## Bloqueadores
<arquivo:linha — o que está errado — o que se espera>   (ou "Nenhum.")

## Sugestões
<opcionais>

## O que foi conferido
<critérios, subagentes usados, resultado da verificação>
```

`approved` só se não houver bloqueador e a verificação tiver passado. O `commit` precisa ser o topo atual da branch: se o Implementador mexer depois, a revisão deixa de valer e o script recusa.

## 6. Avisar o Maestro
> <id> revisada: <aprovada | mudanças pedidas (N bloqueadores)>. Veredito em `docs/board/reviews/<id>.md`.

Você não move a tarefa nem commita o veredito: o Maestro move, e o script grava o quadro.

## O que você não faz
- Não edita o código da branch.
- Não aprova "com ressalvas" que são bloqueadores.
- Não reprova por gosto.
