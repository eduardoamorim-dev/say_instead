---
status: accepted
date: 2026-11-18
---

# ADR-0004: Workspace de seis crates com portas e adaptadores

## Contexto
As peças que mais vão mudar são os adaptadores de IA (as regras dos provedores mudaram várias vezes em 2026) e de transcrição. A lógica precisa ser testável sem interface e a casca precisa ser trocável.

## Decisão
Um workspace Rust com seis crates: `domain` (tipos, regras e portas), `application` (casos de uso e fila de tarefas) e quatro de adaptadores (`speech`, `providers`, `storage`, `knowledge`). A casca fica em `src-tauri`.

Regra de dependência: `domain` não depende de nenhum crate do projeto nem de biblioteca de infraestrutura; `application` depende só de `domain`; os adaptadores dependem só de `domain`; `src-tauri` monta tudo e é o único que depende de `tauri`.

## Alternativas consideradas
- **Um crate com módulos.** Começo mais rápido; nada impede o domínio de importar o Tauri ou um provedor.

## Consequências
- O compilador garante as fronteiras; `scripts/check-arch.mjs` checa a regra a cada verificação.
- Mais cerimônia no início e mais arquivos `Cargo.toml`.
- Toda necessidade externa do domínio vira trait; cada tecnologia entra como adaptador com teste de contrato.
- Criar crate ou mudar a regra exige ADR novo e alteração em `scripts/config/arch-rules.json`.

## Gatilho de revisão
Nenhum previsto.
