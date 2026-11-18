---
name: plan-milestone
description: Fatia um marco do roteiro em tarefas pequenas, verificáveis e ordenadas, e apresenta o plano ao humano para aprovação. Use no térreo (branch main), no papel de Maestro, quando um marco vai começar ou quando o plano de um marco precisa ser refeito.
argument-hint: "<número do marco, 0 a 9>"
---

# Planejar um marco

Marco pedido: $ARGUMENTS

Você está no papel de Maestro, em `main`. Você planeja; não escreve código de produto.

## 1. Entender antes de fatiar
Leia, nesta ordem:
1. A linha do marco em `docs/roadmap.md`: entrega e "pronto quando".
2. As seções de `docs/architecture.md` que o marco toca.
3. Os ADRs dessas seções.
4. `docs/open-questions.md`: o que precisa estar decidido ou verificado antes deste marco.
5. O que já existe: `node scripts/task.mjs list` e a estrutura atual do código. Para busca ampla, use um subagente `Explore`.

Se uma decisão do humano bloqueia o marco, pergunte agora. Se uma verificação técnica bloqueia, ela vira a primeira tarefa, do tipo `spike`.

## 2. Fatiar
Regras de corte:
- **Cada tarefa cabe em uma sessão de trabalho** e termina com algo que roda ou com um teste que passa. Se o diff não se descreve em um parágrafo, corte de novo.
- **Risco primeiro.** O que pode derrubar o marco vem antes do que é só trabalho.
- **Porta antes do adaptador.** Para cada tecnologia: (a) trait em `domain` + falso em memória + teste de contrato; (b) adaptador real passando no mesmo contrato; (c) caso de uso em `application`; (d) comando na casca; (e) tela.
- **Backend antes de frontend.** A tela entra quando o comando que ela chama já existe e está testado.
- **Uma área por tarefa**, quando der (`--area`).
- **Dependências explícitas** (`--depends`). Prefira tarefas que possam andar em paralelo, respeitando o limite de trabalho em andamento.
- **Nada de tarefa "refatorar" ou "melhorar" sem critério verificável.**
- Entre cinco e dez tarefas por marco. Mais que isso, o marco está grande ou as tarefas estão pequenas demais.

## 3. Escrever cada tarefa
```
node scripts/task.mjs new --title "…" --milestone N --area <área> [--type spike|chore|bug] [--depends T-000X,T-000Y]
```
Depois preencha o arquivo criado. Uma boa especificação (veja `docs/board/README.md`):
- **Objetivo:** o que passa a existir.
- **Contexto:** aponta seções, ADRs, skills e arquivos. Não copia.
- **Escopo** e **Fora de escopo:** o Implementador não decide o limite.
- **Critérios de aceite:** cada um verificável por comando, teste ou observação objetiva. Inclua pelo menos um teste negativo quando a tarefa cria uma regra ou validação.
- **Verificação:** os comandos e a evidência esperada; termina em `node scripts/verify.mjs --full` verde.

Ao fim, `node scripts/task.mjs check`.

## 4. Conferir o plano contra o marco
- Somando as tarefas, o "pronto quando" do marco fica demonstrado? Qual tarefa demonstra?
- Alguma tarefa contraria um ADR? Se sim, o ADR novo vem antes e é decisão do humano.
- Algo do marco ficou sem tarefa?
- Algo entrou que é de outro marco? Tire.

## 5. Apresentar ao humano
Mostre uma tabela: id, título, área, tipo, depende de, e o critério principal. Diga a ordem sugerida, o que pode andar em paralelo, os riscos e as perguntas em aberto. Pare e espere.

## 6. Depois da aprovação
- Ajuste o que ele pediu.
- `node scripts/task.mjs move <id> ready` para cada tarefa aprovada (o script recusa especificação incompleta).
- Atualize a coluna "Estado" do marco em `docs/roadmap.md` e rode `node scripts/task.mjs sync --note "plano do marco N"`.

Não mova nada para `ready` sem aprovação explícita.
