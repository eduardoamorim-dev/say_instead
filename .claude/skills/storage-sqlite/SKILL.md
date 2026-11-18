---
name: storage-sqlite
description: Como implementar a persistência local no crate storage - SQLite com rusqlite, migrações embutidas com backup, modo WAL, busca textual FTS5, UUIDv7, exportação, e o cofre de segredos com keyring. Use ao trabalhar em crates/storage, nas portas MeetingRepository e SecretStore, em esquema de banco, migração, busca, exportação ou armazenamento de chaves.
---

# Dados locais

Fonte: `docs/architecture.md` (seção 7), ADR-0008 e ADR-0013. Um único arquivo SQLite na pasta de dados do app, acessado só por `crates/storage`.

## Regras que não mudam
- **SQL só em `crates/storage`.** A interface nunca escreve SQL; `domain` e `application` falam com a porta `MeetingRepository`.
- **O vídeo não entra no banco.** No máximo o nome do arquivo de origem.
- **Segredo não entra no banco.** A tabela `setting` guarda preferências; chaves ficam no cofre do sistema.
- **`analysis` é imutável.** Refazer a análise cria outra linha. Cada linha grava a versão da base curada, a versão da rubrica e o modelo usado.
- **Texto aberto.** O usuário consegue ler os próprios dados sem o app: esquema simples, exportação em Markdown e JSON.

## Acesso
- `rusqlite` com o SQLite embutido (mesma versão em qualquer PC) e FTS5. Confira os nomes atuais das features do crate em https://docs.rs/rusqlite antes de editar o `Cargo.toml`.
- Modo WAL, uma única conexão de escrita. Leitura pode ter conexão própria.
- `rusqlite` é síncrono: toda consulta roda fora do executor assíncrono e fora da thread da interface. O adaptador esconde isso atrás da porta.
- Chaves estrangeiras ligadas. Escrita composta em transação.
- Consulta sempre parametrizada. Nunca montar SQL com texto vindo de fora.

## Esquema
Tabelas previstas: `meeting`, `participant`, `speaker`, `segment`, `analysis`, `finding`, `conversation`, `message`, `job`, `knowledge_pack`, `setting`. O papel de cada uma está na seção 7 da arquitetura.

- Identificadores em UUIDv7 (ordenáveis por tempo), gerados no núcleo.
- `segment` indexado por FTS5 para busca textual.
- Nomes de tabela e coluna em inglês, no singular.
- Apagar uma reunião remove transcrição, análise, conversa e a pasta de sessão de uma vez (cascata no banco e limpeza de arquivos no caso de uso).

Sugestões do kit, que a arquitetura não fixou (confirme na primeira tarefa de banco e registre no relatório): datas em UTC; tempo de trecho em milissegundos desde o início do áudio; busca que ignora acento e caixa, que é o esperado em português.

## Migrações
- Numeradas, embutidas no binário, aplicadas na abertura do app dentro de transação.
- Antes de migrar, cópia do arquivo do banco para `.bak`.
- Migração aplicada não se edita: corrigir é migração nova.
- Toda migração tem teste: um banco de fixture de cada versão antiga chega à atual sem perda. A fixture é um arquivo pequeno, com dados sintéticos.
- Mudança de formato que quebra compatibilidade pede ADR.

## Exportação
- Markdown: transcrição e análise, legível por humano.
- JSON completo, que importa de volta. O teste de ida e volta (exporta, importa, compara) é obrigatório.

## Cofre de segredos (`SecretStore`)
- Crate `keyring`, usando o Gerenciador de Credenciais do Windows. Confira a API atual do crate.
- Operações: guardar, existir, remover, e usar internamente no adaptador de IA. Não existe caminho que devolva a chave para a interface.
- A chave nunca aparece em log, erro, `Debug` de struct ou teste. Tipo que carrega segredo não deriva `Debug` com o valor.
- Falso em memória para os testes; o adaptador real tem teste marcado como lento, porque depende do sistema.

## Resiliência
- Fechar o app no meio de uma escrita não corrompe: WAL e transações.
- A tabela `job` guarda etapa e progresso para retomada (skill `rust-core`).
- Há teste que mata o processo no meio de uma tarefa e reabre.

## Testes
- Contrato de `MeetingRepository` rodando contra o falso em memória e contra o SQLite em arquivo temporário: mesma suíte, dois adaptadores.
- Migrações com fixtures; ida e volta de exportação; busca textual com acento e caixa.
- Banco de teste sempre em pasta temporária, nunca na pasta real do app.

## Antes de entregar
- Nenhum `rusqlite` fora de `crates/storage` (`check-arch`).
- Migração nova tem fixture e teste.
- Nenhum dado real em fixture.
