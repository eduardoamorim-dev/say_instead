# {{APP_NAME}}

App de desktop para Windows, de código aberto e custo zero. Recebe o vídeo de uma reunião de venda, transcreve no próprio computador e abre uma conversa de análise com a IA que o usuário já tem. O vídeo nunca é copiado nem guardado.

Este arquivo é um mapa. A verdade mora nos documentos apontados aqui.

## Onde está cada coisa
- `docs/architecture.md`: arquitetura (fonte da verdade para decisão técnica)
- `docs/adr/`: uma decisão por arquivo; ADR aceito não se reescreve
- `docs/roadmap.md`: os dez marcos e o critério de pronto de cada um
- `docs/workflow.md`: papéis, estados da tarefa e portões
- `docs/board/`: quadro. `tasks/` (especificação), `reports/` (entrega), `reviews/` (revisão)
- `docs/open-questions.md`: decisões do humano e verificações técnicas pendentes
- `docs/harness.md`: como funcionam os guardas e os scripts
- `.claude/skills/`: fluxos e conhecimento por área. Carregue a skill da área antes de mexer nela

## Regras que não se negociam
1. **Custo zero.** Nada que gere conta: serviço pago, runner pago, chave de API no CI, telemetria.
2. **Local-first.** Áudio e vídeo nunca saem da máquina nem são copiados. Só texto vai ao provedor que o usuário escolheu.
3. **Só Windows 10 e 11, 64 bits.** O que for específico do Windows fica em adaptador.
4. **Dependências apontam para dentro.** `domain` não depende de nada do projeto; `application` só de `domain`; os adaptadores (`speech`, `providers`, `storage`, `knowledge`) só de `domain`; só `src-tauri` conhece o Tauri e monta tudo.
5. **Provedor é detalhe.** Nenhum tipo de `domain` ou `application` cita Claude, OpenAI, Gemini ou Ollama.
6. **Tudo que demora é tarefa** com progresso, cancelamento e retomada, fora da thread da interface.
7. **A interface não toca em disco, rede nem segredo.** Ela chama comandos tipados em `ui/src/ipc/`.
8. **O agente de IA do app roda sem escrita e sem terminal.** Todo pedido de permissão é negado.
9. **Texto para o usuário em pt-BR e inglês, via i18n. Código, identificadores e banco em inglês.**

IMPORTANTE: se a melhor solução contraria uma dessas regras, um ADR ou `docs/architecture.md`, pare e avise antes de implementar. Reversão de decisão é sempre explícita e passa pelo humano (skill `write-adr`).

## Como se trabalha aqui
- Uma tarefa por vez, numa branch `task/T-NNNN-slug` (um andar do Maestri). Em `main` só docs, quadro e harness.
- Comece pela skill `start-task` e termine pela `finish-task`. Quem revisa usa `review-task`, em contexto limpo.
- Fatias pequenas: backend antes de frontend; commit a cada passo que compila e passa nos testes.
- Achou algo fora do escopo da tarefa? Anote em "Descobertas" no relatório. Não faça junto.
- Antes de usar uma API de biblioteca que você não conferiu nesta sessão, consulte a documentação atual (subagente `docs-researcher`). As versões mudam e a memória engana.
- Busca ampla no código e saída longa de build vão para subagente (`Explore`, `verifier`), para não encher o contexto.
- Não sabe, ou não conseguiu verificar? Diga isso. Não preencha com suposição.

## Comandos
- `node scripts/verify.mjs`: rápido (formata, lint, testes de unidade). Rode antes de encerrar.
- `node scripts/verify.mjs --full`: o mesmo que o CI. Obrigatório antes de pedir revisão.
- `node scripts/task.mjs list | next | show T-NNNN`: quadro. Só o Maestro move tarefa, e só em `main`.
- `node scripts/check-arch.mjs`: regra de dependência.
- `node scripts/doctor.mjs`: diagnóstico do ambiente.
- `pnpm run dev`: abre o app (existe a partir do marco 0).

## Convenções
- Commits em português, formato Conventional Commits: `feat(speech): …`, `fix(storage): …`, `docs: …`.
- Rust: erros tipados, sem `unwrap`/`expect` fora de teste, sem `unsafe` sem ADR. Log nunca contém transcrição nem chave.
- Toda porta tem teste de contrato; o domínio se testa com adaptadores falsos em memória.
- Dados de teste: só gravação encenada e transcrição sintética. Nenhuma reunião real entra no git.

## Ao compactar
Preserve: id e arquivo da tarefa em andamento, critérios de aceite ainda não atendidos, arquivos alterados, o último resultado de `verify` e qualquer pergunta em aberto para o humano.
