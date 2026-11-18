---
name: land-task
description: "Aterrissa em main uma tarefa já verificada: confere as pré-condições, faz o merge, verifica, marca a tarefa como landed e orienta a limpeza do andar. Comando do humano; não é invocado por agente."
argument-hint: "<T-NNNN>"
disable-model-invocation: true
---

# Aterrissar uma tarefa

Tarefa: $ARGUMENTS

Este comando foi digitado pelo humano: essa é a autorização para aterrissar esta tarefa, e só esta. Execute no térreo, em `main`.

## 1. Pré-condições
```
git branch --show-current                      # precisa ser main
git status --porcelain                         # precisa estar limpo
node scripts/task.mjs show <id>                # estado "verified" e condições ainda valendo
```
O `show` confere de novo o que valia na revisão. Se ele disser que as condições de "verified" deixaram de valer (a branch mudou depois da revisão, ou `main` recebeu código depois que a branch saiu), a tarefa volta ao andar: `git merge main` lá, verificação completa, nova revisão. Avise o humano e pare.

Se o estado não for `verified`, pare e diga o que falta. Não use `--force`.

## 2. Mostrar o que vai entrar
```
git log --oneline main..<branch>
git diff main...<branch> --stat
```
Resuma em três linhas o que aterrissa. Se algo no diff não bate com a tarefa, pare e pergunte.

## 3. Merge
Com repositório no GitHub e a branch publicada, prefira o pull request, porque o CI roda em máquina limpa:
```
git push -u origin <branch>
gh pr create --base main --head <branch> --title "<id>: <título>" --body-file docs/board/reports/<id>.md
gh pr checks --watch
gh pr merge --merge --delete-branch          # o guarda pede confirmação
git pull --ff-only
```
Use merge commit, não squash: o quadro confere que a branch está contida em `main`.

Sem remoto, merge local:
```
git merge --no-ff <branch> -m "merge: <id> <título>"     # o guarda pede confirmação
```
Conflito: não resolva no térreo. `git merge --abort`, devolva a tarefa ao andar e avise.

## 4. Fechar no quadro
```
node scripts/task.mjs move <id> landed
```
O script confere que a branch está em `main` e diz uma de duas coisas:
- **"o térreo herdou a verificação":** o código de `main` é idêntico ao que foi verificado na branch. Nada a recompilar.
- **"main difere do que foi verificado":** o merge juntou mudanças. Rode `node scripts/verify.mjs --full` no térreo antes de qualquer outra coisa. Se falhar, pare e avise: `main` quebrada tem prioridade sobre qualquer tarefa.

## 5. Publicar e olhar as descobertas
```
git push                                       # se houver remoto
```
Com remoto, confira o CI de `main` (`gh run list --limit 1`). Se o relatório da tarefa trouxe "Descobertas", proponha ao humano as tarefas novas; não as crie sem ele pedir.

## 6. Limpar
Diga ao humano para remover o andar no Maestri (o hook de Teardown confere se não há trabalho solto e libera o disco). Depois:
```
git branch -d <branch>
```
`-d` minúsculo: o git recusa se a branch não estiver em `main`.

## 7. Relatar
Uma linha: o que aterrissou, o commit de merge, o estado da verificação, e qual é a próxima tarefa livre (`node scripts/task.mjs next`).
