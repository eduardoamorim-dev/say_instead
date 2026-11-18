---
name: start-task
description: "Começa uma tarefa do quadro do jeito certo: confirma a branch, lê a especificação e o contexto, checa conflito com ADRs, planeja em passos pequenos e implementa com teste e verificação frequente. Use no andar da tarefa (branch task/T-NNNN-slug), no papel de Implementador, sempre que for iniciar ou retomar uma tarefa."
argument-hint: "[T-NNNN]"
---

# Começar uma tarefa

Tarefa: $ARGUMENTS (se vazio, descubra pela branch: `git branch --show-current`)

## 1. Situar-se
- Confirme a branch: precisa ser `task/<id>-…`. Em `main` não se escreve código de produto; se estiver lá, pare e avise o Maestro.
- Abra `docs/board/tasks/<id>-*.md` e leia inteiro.
- `git status` e `git log --oneline main..HEAD`: é começo ou retomada? Se há commits, leia-os antes de continuar. Se existe `docs/board/reports/<id>.md`, leia: é o estado de quem trabalhou antes.
- Se a tarefa voltou de revisão, leia `git show main:docs/board/reviews/<id>.md` e trate os bloqueadores primeiro.

## 2. Ler o contexto que a tarefa aponta
- As seções de `docs/architecture.md` e os ADRs citados.
- As skills citadas (carregue cada uma).
- Os arquivos e interfaces citados. Para entender uma área maior do código, use um subagente `Explore` e peça só a conclusão.

## 3. Checar conflito antes de escrever
Responda para si mesmo:
- Algum critério de aceite contraria um ADR aceito, um princípio ou `docs/architecture.md`?
- A solução que parece melhor exige biblioteca nova, crate novo, mudança de formato de dado ou algo que gere custo?
- A especificação é ambígua em algo que muda o resultado?
- A tarefa depende de um item de `docs/open-questions.md`?

Se alguma resposta for sim: **pare e avise o Maestro**, dizendo o conflito e as opções. Não implemente uma reversão de decisão por conta própria.

## 4. Planejar
Escreva, em poucas linhas: o objetivo com as suas palavras, os critérios de aceite, os arquivos que vai criar ou tocar, e a ordem dos passos. Cada passo termina com algo que compila e com um teste. Se a tarefa tem backend e frontend, backend primeiro.

Se o plano tocar mais do que a tarefa descreve, o plano está errado ou a tarefa está: avise.

## 5. Implementar
- **Documentação antes de API.** Antes de usar biblioteca, protocolo ou comando que você não conferiu nesta sessão, chame o subagente `docs-researcher`. Não escreva contra a API "de memória".
- **Teste primeiro, quando der.** Escreva o teste do critério, veja falhar, implemente, veja passar.
- **Passos pequenos.** Commit a cada passo verde, em português, formato Conventional Commits (`feat(speech): …`).
- **Verifique com frequência:** `node scripts/verify.mjs`. Para não encher o contexto com saída de build, delegue ao subagente `verifier`.
- **Corrija a causa.** Não apague teste, não enfraqueça asserção, não use `#[allow]`, `any` ou `--no-verify` para passar.
- **Fique no escopo.** Bug vizinho, dívida, ideia: anote para a seção "Descobertas" do relatório. Não faça junto.
- **Dependência nova** só se a tarefa pedir; confira `scripts/config/arch-rules.json` e `scripts/config/policy.json` antes.

## 6. Quando travar
Depois de duas tentativas com abordagens diferentes para o mesmo erro, pare. Diga o que tentou, o que observou e qual é a sua hipótese. Peça ajuda ao Maestro em vez de insistir.

## 7. Terminar
Quando todos os critérios estiverem atendidos, use a skill `finish-task`. Não avise que terminou antes disso.
