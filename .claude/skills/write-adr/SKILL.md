---
name: write-adr
description: Registra ou propõe uma decisão de arquitetura como ADR em docs/adr, incluindo o caso de substituir uma decisão anterior. Use quando uma tarefa exige escolher ou trocar tecnologia de base, criar crate, mudar a regra de dependência, mudar formato de dado persistido, abrir exceção a um princípio ou aceitar qualquer custo; e sempre que a melhor solução contrariar um ADR aceito.
argument-hint: "<assunto da decisão>"
---

# Escrever um ADR

Assunto: $ARGUMENTS

Um ADR registra uma decisão com consequência duradoura. Quem aceita é o humano. Você propõe.

## Precisa mesmo de ADR?
Sim, se a decisão: troca ou acrescenta tecnologia de base; cria crate ou muda `scripts/config/arch-rules.json`; muda formato de banco, de pacote da base ou de IPC público; abre exceção a um princípio de `docs/architecture.md`; gera custo; ou reverte um ADR aceito.

Não, se é escolha local e reversível (nome, estrutura interna de um módulo, biblioteca utilitária pequena dentro do que já é permitido). Essas vão em "Decisões tomadas" no relatório da tarefa.

## Passos
1. **Leia o que já foi decidido.** `docs/adr/README.md` e os ADRs do mesmo tema. Leia a seção correspondente de `docs/architecture.md`.
2. **Levante os fatos.** O que foi observado (erro, medição, limite de biblioteca), com evidência. Para fatos sobre biblioteca, use o subagente `docs-researcher`. Separe fato de inferência.
3. **Liste pelo menos duas alternativas reais**, incluindo manter como está. Para cada uma: o que se ganha, o que se perde, o que custa.
4. **Escreva** a partir de `docs/adr/0000-template.md`, em `docs/adr/NNNN-titulo-curto.md` (próximo número livre), com `status: proposed` e a data de hoje. O título diz a decisão no afirmativo. Uma página, no máximo.
5. **Se substitui um ADR aceito:** diga isso no contexto do novo ("Substitui o ADR-00XX"). Não toque no antigo ainda; depois de o humano aceitar o novo, o antigo recebe `status: superseded by NNNN` (a edição pede confirmação).
6. **Acrescente a linha** no índice de `docs/adr/README.md`, com status "proposto".
7. **Pare e apresente ao humano:** a decisão em uma frase, as alternativas, a consequência principal e o que você recomenda. Diga claramente se é uma reversão de algo já decidido.

## Depois que o humano aceitar
- Ele (ou você, a pedido dele) troca `status` para `accepted`.
- Atualize `docs/architecture.md` na seção afetada (a edição pede confirmação) e, se for o caso, `scripts/config/arch-rules.json` ou `policy.json`.
- Só então o código que depende da decisão pode ser escrito.

## O que não fazer
- Não implemente primeiro e registre depois.
- Não edite um ADR aceito para "ajustar" a decisão.
- Não escreva ADR para justificar atalho que a tarefa não pediu.
- Não esconda o custo: se a decisão cria dívida ou risco, isso vai em "Consequências".
