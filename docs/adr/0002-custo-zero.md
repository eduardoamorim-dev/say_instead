---
status: accepted
date: 2026-11-18
---

# ADR-0002: O projeto não paga por nada

## Contexto
O projeto é de código aberto e não busca receita. Qualquer custo recorrente (servidor, domínio, certificado, API de IA) depende do bolso de quem mantém e ameaça a continuidade.

## Decisão
Toda infraestrutura vem de serviço gratuito para código aberto. Quando a opção gratuita tem limitação, a limitação é documentada, não comprada. A IA de quem usa o app é a assinatura, a chave ou o modelo local do próprio usuário.

## Alternativas consideradas
- **Certificado de assinatura de código pago.** Tiraria o aviso do Windows desde a primeira release; custa de US$ 150 a 300 por ano.
- **Servidor próprio para atualização e base curada.** Mais controle; custo e operação.

## Consequências
- GitHub público para código, CI em runner padrão, releases e página.
- Sem telemetria, sem servidor, sem domínio próprio.
- O CI só roda verificação determinística; avaliações que chamam modelo rodam na máquina de quem mantém.
- O instalador sai sem assinatura na primeira fase (ADR-0015), com aviso do SmartScreen e bloqueio pelo Smart App Control.
- `scripts/check-zero-cost.mjs` barra runner pago, segredo de API no CI e SDK de serviço pago.

## Gatilho de revisão
Patrocínio estável que cubra um custo específico, com decisão explícita do mantenedor sobre qual custo aceitar.
