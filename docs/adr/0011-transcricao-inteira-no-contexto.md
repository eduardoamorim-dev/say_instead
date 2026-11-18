---
status: accepted
date: 2026-11-18
---

# ADR-0011: A análise recebe a transcrição inteira

## Contexto
Analisar uma reunião de venda depende de ver o todo: a ordem dos assuntos, quem dominou a conversa, o que faltou. Uma hora de reunião dá perto de 15 mil tokens, pela estimativa de 150 palavras por minuto.

## Decisão
A transcrição inteira entra no contexto, com falante e tempo. Não há busca vetorial. A ordem do contexto é fixa, do mais estável ao mais variável: papel e rubrica, skills da base, charter, métricas e transcrição, tarefa ou pergunta. Reunião acima de três horas passa por resumo em blocos.

## Alternativas consideradas
- **Busca vetorial por trechos (RAG).** Menos tokens; perde a visão do todo e exige embeddings e índice vetorial.

## Consequências
- Mais tokens por pergunta, pagos pela assinatura ou chave do usuário.
- A ordem fixa aproveita cache de prompt nos provedores que oferecem.
- O que é contável (proporção de fala, perguntas, maior monólogo, minuto do preço) é calculado em Rust e entra como fato.
- Nenhuma dependência de modelo de embedding nem de banco vetorial.

## Gatilho de revisão
Reuniões longas passarem a ser o caso comum, ou o custo por pergunta virar queixa recorrente.
