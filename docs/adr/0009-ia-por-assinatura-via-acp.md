---
status: accepted
date: 2026-11-18
---

# ADR-0009: IA por assinatura entra pelo ACP

## Contexto
O usuário quer usar a assinatura que já paga (Claude, ChatGPT, Copilot). Cada provedor tem um CLI de agente, e as regras de uso de assinatura em app de terceiros mudaram várias vezes em 2026. O app não pode ler credencial de ninguém.

## Decisão
O app inicia o CLI do agente como subprocesso e conversa pelo Agent Client Protocol, com o crate oficial `agent-client-protocol` (5.3.0 em novembro de 2026, protocolo v1). O agente usa o login que já tem. O app não declara capacidade de escrita nem de terminal, nega todo `session/request_permission` e dá a cada conversa uma pasta isolada em `cache/`.

## Alternativas consideradas
- **Modo headless de cada CLI** (`claude -p --output-format stream-json`, `codex exec --json`). Dispensa Node; um adaptador e um formato de evento por CLI.

## Consequências
- Um cliente só para vários agentes, com permissões padronizadas.
- Os adaptadores ACP do Claude e do Codex são distribuídos por npm e pedem Node na máquina do usuário.
- A situação de cada provedor mora em `providers.json`, na base curada, e não no código.
- A chave de API (ADR-0010) continua sempre disponível como caminho estável.
- Pendentes: como o protocolo declara ausência de capacidade (V2) e CLI instalado só no WSL (V3).

## Gatilho de revisão
Se a exigência de Node atrapalhar usuários reais, o segundo adaptador a escrever é o headless do Claude.
