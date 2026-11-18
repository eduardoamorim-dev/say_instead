---
name: rust-core
description: Como escrever o núcleo Rust do app nos crates domain e application - regra de dependência, portas (traits) e adaptadores, erros tipados, padrão de tarefa longa com progresso e cancelamento, e composição na casca. Use ao criar ou alterar tipos de domínio, portas, casos de uso, a fila de tarefas ou qualquer Cargo.toml do workspace.
---

# Núcleo Rust: domínio, aplicação e portas

Fonte: `docs/architecture.md` (seções 3 e 5), ADR-0004. A regra de dependência é verificada por `node scripts/check-arch.mjs`.

## Onde cada coisa mora

| Crate | Contém | Não contém |
|---|---|---|
| `domain` | Tipos (`Meeting`, `Segment`, `Analysis`…), regras puras, as portas (traits), erros do domínio | Tauri, SQLite, HTTP, runtime assíncrono, nome de provedor, API do Windows |
| `application` | Casos de uso que orquestram portas; a fila de tarefas | Implementação de porta; qualquer biblioteca de infraestrutura |
| `speech`, `providers`, `storage`, `knowledge` | Uma implementação por tecnologia de cada porta | Dependência de outro adaptador ou de `application` |
| `src-tauri` | Composição (instancia adaptadores e injeta nos casos de uso), comandos, canais | Regra de negócio |

Teste rápido para decidir: se o código continuaria igual trocando a biblioteca, é domínio ou aplicação. Se muda com a biblioteca, é adaptador.

## Portas
- Uma porta é um trait em `domain`, com tipos do domínio na assinatura. Nada de tipo de biblioteca vazando (`rusqlite::Row`, `reqwest::Error`).
- O nome diz a capacidade, não a tecnologia: `SpeechToText`, não `SherpaClient`.
- Cada porta nasce com três coisas: o trait, um falso em memória e uma suíte de teste de contrato que qualquer implementação precisa passar (veja a skill `testing-strategy`).
- O falso em memória mora num lugar que os testes dos outros crates alcançam (por exemplo, um módulo de `domain` atrás de uma feature de teste). Escolha na primeira porta e mantenha.
- Porta assíncrona: a forma (trait assíncrono nativo, `async-trait`, futuros em caixa) é a pendência T3 de `docs/open-questions.md`. Antes de escrever a primeira, confira o estado atual da linguagem com o subagente `docs-researcher` e registre a escolha.

## Tarefa longa
Tudo que demora (decodificar, transcrever, baixar modelo, analisar) segue um padrão só:
- O caso de uso devolve um `job_id` na hora e o trabalho segue em segundo plano.
- O progresso sai por um canal de eventos do domínio: etapa, fração concluída, mensagem em código (não em frase).
- O cancelamento é um sinal que o trabalho consulta dentro do laço, entre blocos. Cancelar deixa o estado consistente.
- Cada etapa concluída grava um ponto de retomada (tabela `job`). Reabrir o app retoma ou limpa.
- Trabalho que bloqueia (SQLite, decodificação, inferência) roda em thread própria, nunca no executor assíncrono nem na thread da interface.

A fila e os tipos de progresso vivem em `application` e `domain`. A casca só liga o canal do domínio ao canal do Tauri.

## Erros
- Um enum de erro por crate, com `thiserror`. Erro de biblioteca é convertido na fronteira do adaptador.
- O domínio expõe códigos estáveis; a interface traduz. Nenhuma frase para o usuário nasce no Rust.
- Sem `unwrap`, `expect` ou `panic!` fora de teste. Sem `unsafe` sem ADR.
- Erro nunca carrega texto de transcrição nem segredo.

## Provedor é detalhe
Nenhum tipo, enum, constante ou string de `domain` e `application` cita Claude, OpenAI, Gemini, Codex ou Ollama. O que varia por provedor é dado (`ProviderDescriptor`), vindo do adaptador.

## Dependências
- Antes de acrescentar uma, leia `scripts/config/arch-rules.json`: várias só são permitidas em um crate.
- Versões no `[workspace.dependencies]` da raiz; os crates herdam.
- Licença precisa passar em `cargo deny`. Sem SDK de serviço pago ou telemetria (`scripts/config/policy.json`).
- Biblioteca nova que não é utilitário pequeno pede ADR.

## Convenções
- Identificadores e comentários em inglês. Identificadores de entidade em UUIDv7.
- Log com `tracing`, estruturado, sem dado sensível.
- Item público documentado quando o nome não basta.
- Módulo pequeno e coeso; função com uma responsabilidade.

## Antes de entregar
- `node scripts/check-arch.mjs` passa.
- Porta nova tem falso e contrato; caso de uso novo tem teste com falsos.
- Nada de infraestrutura entrou em `domain` ou `application`.
