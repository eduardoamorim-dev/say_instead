---
id: T-0004
title: "CI verde no GitHub Actions"
milestone: 0
area: foundation
type: chore
status: backlog
depends_on: [T-0002]
branch: task/T-0004-ci-verde-no-github-actions
---

## Objetivo
Fazer o CI rodar em Windows a mesma verificação que os agentes rodam localmente, com as dependências auditadas, sem nenhum custo. É o critério de pronto do marco 0.

## Contexto
- `docs/architecture.md`, seções 13 e 14
- ADR-0002 (custo zero)
- `.github/workflows/ci.yml` já existe como ponto de partida; `scripts/check-zero-cost.mjs` lê esse arquivo
- Pendências T2 e H5 em `docs/open-questions.md`
- Skills: `windows-release`, `testing-strategy`
- Editar `.github/workflows/` pede confirmação humana: explique a mudança antes

## Escopo
- Conferir a versão atual de cada action do workflow e fixar cada uma por SHA de commit, com a versão em comentário
- `deny.toml` com a lista de licenças aceitas (todas aprovadas pela OSI, compatíveis com a licença do projeto), fontes permitidas e checagem de vulnerabilidades
- Cache de build do Rust e do pnpm
- `dependabot.yml` para cargo, npm e actions, com frequência semanal
- Auditoria de dependências npm no CI
- ADR com a lista de licenças aceitas (pendência T2)

## Fora de escopo
- Pipeline de release por tag e assinatura do updater (marco 8)
- Teste de ponta a ponta com WebDriver
- Qualquer runner que não seja o padrão gratuito

## Critérios de aceite
- [ ] Um push em branch de teste roda o workflow em `windows-latest` e termina verde (link da execução no relatório)
- [ ] Um pull request com erro de formatação fica vermelho
- [ ] Toda action está fixada por SHA
- [ ] `cargo deny check` passa localmente e no CI; acrescentar uma dependência com licença fora da lista faz falhar (mostre e desfaça)
- [ ] `node scripts/check-zero-cost.mjs` passa; nenhum segredo é usado
- [ ] O tempo da execução com cache quente está anotado no relatório

## Verificação
`node scripts/verify.mjs --full` verde, com `rust:deny` executado. Execução do CI verde na branch da tarefa.

## Notas
Se o repositório ainda não estiver no GitHub, pare e avise: criar repositório é ato humano.
