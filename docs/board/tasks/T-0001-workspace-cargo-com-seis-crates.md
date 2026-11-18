---
id: T-0001
title: "Workspace Cargo com seis crates"
milestone: 0
area: foundation
type: feature
status: backlog
depends_on: []
branch: task/T-0001-workspace-cargo-com-seis-crates
---

## Objetivo
Criar o workspace Rust com os seis crates da arquitetura, vazios mas compiláveis e testáveis, com a regra de dependência passando na checagem automática.

## Contexto
- `docs/architecture.md`, seção 5 (Organização do código)
- ADR-0004 (seis crates com portas e adaptadores)
- Skills: `rust-core`, `testing-strategy`
- `scripts/config/arch-rules.json` já descreve a regra; não altere esse arquivo

## Escopo
- `Cargo.toml` na raiz com `[workspace]`, `resolver`, `[workspace.package]` (edição, licença, versão) e `[workspace.dependencies]`
- `rust-toolchain.toml` fixando o canal estável e os componentes `rustfmt` e `clippy`
- `crates/domain`, `application`, `speech`, `providers`, `storage`, `knowledge` como bibliotecas, com as dependências internas permitidas declaradas
- Lints do workspace: `unsafe_code = "forbid"`; `clippy::unwrap_used` e `clippy::expect_used` negados fora de teste
- Um teste de unidade por crate, só para provar que o `cargo test` roda
- `Cargo.lock` commitado

## Fora de escopo
- `src-tauri` e `ui` (T-0002)
- Qualquer tipo de domínio, porta ou adaptador real
- CI (T-0004)

## Critérios de aceite
- [ ] `cargo metadata --no-deps` lista exatamente seis pacotes, um em cada pasta de `crates/`
- [ ] `node scripts/check-arch.mjs` passa
- [ ] Adicionar temporariamente `storage` como dependência de `domain` faz `node scripts/check-arch.mjs` falhar com ARQ001 (mostre a saída no relatório e desfaça)
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` passa sem nenhum `#[allow]`
- [ ] `cargo test --workspace` roda pelo menos um teste por crate
- [ ] Um `unwrap()` fora de teste é recusado pelo clippy (mostre no relatório e desfaça)

## Verificação
`node scripts/verify.mjs --full` verde, com os passos `arch`, `rust:fmt`, `rust:clippy`, `rust:test` e `rust:doctest` aparecendo como executados, não como pulados.

## Notas
A edição do Rust e a versão mínima do compilador são escolha desta tarefa; registre no relatório. Não crie ADR para isso.
