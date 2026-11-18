---
name: finish-task
description: "Fecha uma tarefa para revisão: confere cada critério de aceite com evidência, escreve o relatório de entrega, roda a verificação completa, commita e avisa o Maestro. Use no andar da tarefa, no papel de Implementador, quando o trabalho estiver pronto ou quando for preciso passar o bastão."
argument-hint: "[T-NNNN]"
---

# Entregar uma tarefa

Tarefa: $ARGUMENTS (se vazio, descubra pela branch)

Pronto não é "o código foi escrito". Pronto é: cada critério tem evidência, a verificação completa passou no estado commitado e o relatório existe.

## 1. Conferir os critérios, um por um
Abra `docs/board/tasks/<id>-*.md`. Para cada critério de aceite, aponte a evidência: o teste que cobre, o comando e a saída, ou `arquivo:linha`. Se um critério pede teste negativo ("X faz falhar"), faça o teste negativo agora, guarde a saída e desfaça.

Critério sem evidência não está atendido. Ou você atende, ou diz no relatório que não atendeu e por quê.

## 2. Reler o próprio diff
`git diff main...HEAD`. Procure o que um revisor procuraria:
- mudança fora do escopo (tire ou justifique)
- código morto, comentário de rascunho, `dbg!`, `console.log`
- `unwrap`, `expect`, `any`, `@ts-ignore`, `#[allow]` sem motivo escrito
- frase visível fora de tradução; dado sensível em log
- arquivo que não deveria estar no commit (modelo, áudio, `.env`)

## 3. Verificação completa
```
node scripts/verify.mjs --full
```
Delegue ao subagente `verifier` se a saída for longa. Se falhar, corrija a causa e rode de novo.

A verificação grava um carimbo do código verificado. Editar documentação ou o relatório depois não invalida o carimbo; editar código, teste, script ou configuração de build invalida, e aí é preciso rodar de novo.

## 4. Escrever o relatório
Crie `docs/board/reports/<id>.md` com as seções de `docs/board/README.md`:
- **Resumo:** o que mudou.
- **Critérios de aceite:** tabela critério, atendido (sim, não, parcial), evidência.
- **Verificação:** o comando rodado e o resultado, com o carimbo que ele imprimiu.
- **Decisões tomadas:** escolhas dentro do escopo, com o motivo.
- **Descobertas:** o que apareceu e ficou de fora; tarefas que você sugere.
- **Como testar à mão:** se fizer sentido.

Diga o que você observou e o que você supõe. Se algo não foi verificado, escreva "não verificado".

## 5. Commitar
```
git add -A
git commit -m "feat(<área>): <o que passa a existir> (<id>)"
git status        # precisa estar limpo
```
Commitar não invalida a verificação: o carimbo é do conteúdo do código, não do commit.

## 6. Avisar o Maestro
Mande pelo canal do Maestri (ou diga ao humano, se não houver canal):

> <id> pronta para revisão. Branch `task/<id>-…`, commit `<sha curto>`. Relatório em `docs/board/reports/<id>.md`. Critérios: N de M atendidos. Descobertas: <uma linha, ou "nenhuma">.

Não mova a tarefa no quadro: quem move é o Maestro, e o script confere o relatório e a verificação sozinho.

## Se não deu para terminar
Passar o bastão também é entrega. Escreva o relatório com o que está feito, o que falta, o que você tentou e onde travou; commite o que compila; avise o Maestro que a tarefa está **bloqueada**, com o motivo. Não deixe trabalho só na árvore de trabalho.
