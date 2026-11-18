---
paths:
  - "crates/**/*.rs"
  - "crates/**/Cargo.toml"
  - "src-tauri/**/*.rs"
  - "src-tauri/Cargo.toml"
  - "Cargo.toml"
---

# Regras para código Rust

- Antes de acrescentar dependência a um `Cargo.toml`, confira `scripts/config/arch-rules.json`. A biblioteca pode ser permitida só em outro crate.
- `domain` e `application` não citam provedor de IA, Tauri, SQLite nem nada do Windows. Se precisar de algo de fora, declare um trait em `domain`.
- Erros tipados por crate (`thiserror`). Nada de `unwrap`, `expect` ou `panic!` fora de teste. Nada de `unsafe` sem ADR.
- Trabalho que bloqueia (SQLite, decodificação, inferência) roda fora do executor assíncrono e fora da thread da interface.
- Toda operação longa é tarefa com progresso, cancelamento e ponto de retomada. Cancelamento é verificado dentro do laço, não só no começo.
- Log estruturado (`tracing`), nunca `println!`. Log não contém texto de transcrição, nome de participante nem chave.
- Caminho de arquivo vindo da interface é validado antes do uso.
- Adaptador novo: primeiro o teste de contrato da porta, depois a implementação.
- Identificadores, comentários de código e mensagens de erro internas em inglês. Texto que o usuário lê não nasce no Rust: a interface traduz códigos de erro estáveis.
- Skill da área antes de mexer: `rust-core`, `tauri-shell`, `speech-pipeline`, `ai-providers`, `storage-sqlite`, `knowledge-pack`, `analysis-engine`.
