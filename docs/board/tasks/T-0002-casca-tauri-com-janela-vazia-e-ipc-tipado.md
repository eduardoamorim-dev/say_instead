---
id: T-0002
title: "Casca Tauri com janela vazia e IPC tipado"
milestone: 0
area: shell
type: feature
status: backlog
depends_on: [T-0001]
branch: task/T-0002-casca-tauri-com-janela-vazia-e-ipc-tipado
---

## Objetivo
Abrir uma janela do app no Windows com a interface React mínima, e provar a fronteira entre interface e núcleo com um comando tipado de ponta a ponta.

## Contexto
- `docs/architecture.md`, seções 4, 5 (Fronteira com a interface) e 12
- ADR-0003 (Tauri 2), ADR-0005 (React, TypeScript, Tailwind, shadcn/ui)
- Pendência T1 em `docs/open-questions.md`: onde vivem os tipos de IPC
- Skills: `tauri-shell`, `ui-frontend`, `rust-core`
- Confira a documentação atual do Tauri 2 e do tauri-specta antes de escrever (subagente `docs-researcher`)

## Escopo
- `package.json` na raiz (pnpm) com os scripts do contrato de `docs/harness.md`: `dev`, `lint`, `typecheck`, `test`, `build:ui`, `bindings:check`
- `ui/`: Vite, React e TypeScript em modo estrito; uma tela que mostra nome e versão do app
- `src-tauri/`: app Tauri 2 com uma janela; um comando `app_info` que devolve nome e versão vindos do núcleo (função em `application`), não escritos na casca
- Tipos TypeScript gerados do comando Rust em `ui/src/ipc/`; a interface só chama a função gerada
- Capabilities mínimas e CSP restrita em `tauri.conf.json`
- ADR resolvendo a pendência T1 (DTO na casca ou `derive` no domínio), com as consequências de cada opção

## Fora de escopo
- Tailwind, shadcn/ui, i18n e rotas (T-0003)
- Updater, instalador e ícones definitivos
- Qualquer comando além de `app_info`

## Critérios de aceite
- [ ] `pnpm run dev` abre uma janela que mostra o nome e a versão do app (descreva o que apareceu)
- [ ] A versão exibida vem do núcleo: mudar a versão do workspace muda o que a tela mostra
- [ ] `node scripts/check-arch.mjs` passa: só `src-tauri` depende de `tauri`; só `ui/src/ipc/` importa `@tauri-apps/*`
- [ ] Mudar a assinatura do comando Rust sem regenerar os tipos faz `pnpm run bindings:check` falhar
- [ ] `pnpm run typecheck`, `pnpm run lint` e `pnpm run test` passam, com pelo menos um teste de componente
- [ ] Nenhuma permissão de capability além das que a tela usa; liste-as no relatório
- [ ] ADR da pendência T1 criado como `proposed`

## Verificação
`node scripts/verify.mjs --full` verde, com os passos `js:*` executados. No relatório: a lista de capabilities, a CSP e a saída do `bindings:check` falhando no teste negativo.

## Notas
Tudo que for específico do Windows (WebView2, caminhos) fica na casca. Não instale nada globalmente; se faltar ferramenta, pare e avise.
