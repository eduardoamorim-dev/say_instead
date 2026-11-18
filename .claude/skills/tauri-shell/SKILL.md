---
name: tauri-shell
description: Como escrever a casca Tauri 2 do app em src-tauri - comandos finos, canais de progresso, tipos de IPC gerados com tauri-specta, capabilities mínimas, CSP e composição dos adaptadores. Use ao criar ou alterar comandos, eventos, permissões, tauri.conf.json, a inicialização do app ou a pasta ui/src/ipc.
---

# Casca Tauri

Fonte: `docs/architecture.md` (seções 4, 5 e 12), ADR-0003. A casca traduz cliques em chamadas ao núcleo. Ela não decide nada.

## Antes de escrever
A API do Tauri 2 e a do tauri-specta mudam entre versões. Confira a versão em `Cargo.lock` e consulte a documentação atual com o subagente `docs-researcher`:
- Tauri 2: https://v2.tauri.app (comandos, canais, capabilities, plugins)
- tauri-specta: https://github.com/specta-rs/tauri-specta

Não escreva assinatura de macro, nome de plugin ou formato de capability de memória.

## O que mora em `src-tauri`
- **Composição:** na inicialização, cria os adaptadores (`speech`, `providers`, `storage`, `knowledge`), injeta nos casos de uso de `application` e guarda no estado gerenciado do app.
- **Comandos:** um por intenção do usuário. Recebem dados simples, validam, chamam um caso de uso, convertem o resultado.
- **Canais:** ligam o canal de progresso do domínio ao canal do Tauri.
- **Configuração:** janela, capabilities, CSP, updater.

Só este pacote depende de `tauri` (`check-arch` barra o resto).

## Comando fino
Um comando tem quatro linhas de intenção: validar entrada, pegar o caso de uso do estado, chamar, mapear erro para código estável. Se aparece regra de negócio, laço ou SQL num comando, o código está no lugar errado.

- **Valide toda entrada no Rust.** A interface não é confiável: confira tamanho, formato, id que existe, caminho dentro do esperado.
- **Caminho de arquivo:** o vídeo é lido onde está, pelo caminho que o sistema entregou no arrastar ou no diálogo de abrir. O conteúdo nunca atravessa o IPC e nunca é copiado.
- **Erro:** devolva um código estável e dados para a mensagem; a interface traduz. Nada de `to_string()` de erro interno para a tela.
- **Segredo nunca volta para a interface.** O comando recebe a chave para guardar; não existe comando que a devolva.

## Tarefa longa
Padrão único: o comando devolve `job_id`; o progresso chega por canal; `cancel_job(job_id)` interrompe. O comando não espera o trabalho terminar e não bloqueia a thread principal. Detalhes na skill `rust-core`.

## Tipos de IPC
- Gerados dos comandos Rust para `ui/src/ipc/`. Não se editam à mão.
- `pnpm run bindings:check` falha se o gerado no repositório difere do que o código produz.
- Onde vivem os tipos (DTO na casca ou `derive` no domínio) é a pendência T1: siga o ADR que a resolveu; se ainda não existe, não escolha em silêncio.
- A interface só importa `@tauri-apps/*` dentro de `ui/src/ipc/`.

## Segurança
- **Capabilities mínimas.** Cada permissão existe porque uma tela usa. Escopo de sistema de arquivos restrito às pastas do app. Permissão nova entra no relatório da tarefa.
- **Uma janela só.** Comandos próprios ficam visíveis a todas as janelas por padrão; não crie janela nova sem rever isso.
- **CSP restrita:** sem origem remota, sem `unsafe-eval`. A interface é página local.
- **Plugins:** só os necessários. Nada de plugin que dê à interface acesso direto a SQL, shell ou HTTP: isso é do núcleo.
- **Subprocesso** (CLI de agente) é iniciado pelo adaptador de `providers`, com argumentos fixos, nunca montados a partir de texto livre.

## Pastas do app
Banco, modelos, base e cache ficam na pasta de dados do app (`data/`, `models/`, `knowledge/<versão>/`, `cache/`). A casca resolve o caminho base e o entrega aos adaptadores; nenhum adaptador adivinha caminho.

## Inicialização e encerramento
- Abrir: migrar o banco (com backup), limpar temporários de execução anterior, retomar ou encerrar tarefas pendentes.
- Fechar com tarefa em andamento: pedir confirmação ou deixar ponto de retomada. Nunca corromper.
- O updater não roda com tarefa em andamento.

## Antes de entregar
- `node scripts/check-arch.mjs` e `pnpm run bindings:check` passam.
- Comando novo tem teste do caso de uso por trás e validação de entrada coberta.
- Lista de capabilities no relatório, com o motivo de cada uma.
- O subagente `security-reviewer` vai olhar: adiante-se.
