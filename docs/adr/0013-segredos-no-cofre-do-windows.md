---
status: accepted
date: 2026-11-18
---

# ADR-0013: Segredos ficam no Gerenciador de Credenciais do Windows

## Contexto
O app guarda chaves de API do usuário. Elas não podem aparecer em log, banco, interface nem arquivo de configuração.

## Decisão
As chaves ficam no cofre do sistema operacional, pelo crate `keyring`, atrás da porta `SecretStore`, implementada no crate `storage`.

## Alternativas consideradas
- **Plugin Stronghold do Tauri.** Cofre próprio, independente do sistema; senha extra para o usuário e relatos, ainda não confirmados, de motor sem manutenção.
- **Arquivo cifrado próprio.** Controle total; reinventar criptografia.

## Consequências
- Nada para o usuário decorar.
- Depende de um serviço do sistema.
- A interface nunca recebe a chave: pede ao núcleo que a use.
- Tabela `setting` guarda só preferências.

## Gatilho de revisão
Falha recorrente do cofre do sistema em máquinas de usuários.
