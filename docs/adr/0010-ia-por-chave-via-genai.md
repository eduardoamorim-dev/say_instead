---
status: accepted
date: 2026-11-18
---

# ADR-0010: IA por chave de API usa o crate genai

## Contexto
A chave de API é o caminho estável quando a regra de assinatura de um provedor muda. O app precisa falar com vários provedores por HTTP, com streaming, sem manter um cliente por provedor.

## Decisão
O adaptador de chave de API usa o crate `genai`. A chave fica no cofre do sistema (ADR-0013) e nunca passa pela interface. O modelo local (Ollama) entra pelo mesmo crate `providers`, por HTTP para a própria máquina.

## Alternativas consideradas
- **Cliente próprio com reqwest para três provedores.** Controle total de cache de prompt e de saída estruturada; três clientes para manter.
- **SDKs TypeScript na interface.** SDKs oficiais; a chave passaria pela interface, contra o princípio de menor privilégio.

## Consequências
- Muitos provedores com um cliente só.
- O crate prioriza o que é comum a todos: saída estruturada pode exigir código por provedor.
- O custo por reunião fica visível ao usuário, que é quem paga pelo uso.
- Nenhuma chave aparece em log, banco ou interface.

## Gatilho de revisão
O crate não suportar saída estruturada ou cache de prompt de um provedor importante, a ponto de o contorno custar mais que um cliente próprio.
