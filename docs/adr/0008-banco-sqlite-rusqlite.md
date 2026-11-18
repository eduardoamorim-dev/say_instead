---
status: accepted
date: 2026-11-18
---

# ADR-0008: Banco local em SQLite via rusqlite

## Contexto
Os dados são de um usuário só, num computador só, e precisam ser legíveis sem o app (princípio do texto aberto). É preciso busca textual na transcrição.

## Decisão
SQLite embutido pelo crate `rusqlite`, com FTS5, modo WAL e uma conexão de escrita. Migrações numeradas embutidas no binário, com cópia `.bak` antes de migrar. Identificadores UUIDv7. Acesso só pelo crate `storage`.

## Alternativas consideradas
- **sqlx.** Assíncrono e com consultas verificadas na compilação; peso e complexidade a mais para um banco de um usuário.
- **tauri-plugin-sql.** SQL direto no frontend; leva regra de dados para a interface, contra o princípio do núcleo.

## Consequências
- Mesma versão do SQLite em qualquer PC.
- A consulta bloqueia a thread: roda fora da thread da interface.
- A interface nunca escreve SQL.
- Criptografia do banco fica fora da primeira versão; a proteção inicial é a criptografia de disco do sistema.

## Gatilho de revisão
Pedido real de criptografia do banco ou de sincronização entre aparelhos.
