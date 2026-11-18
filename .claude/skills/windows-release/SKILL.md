---
name: windows-release
description: Como empacotar, publicar e atualizar o app no Windows sem custo - instalador NSIS por usuário, pipeline de release no GitHub Actions, updater do Tauri com chave própria, o problema do instalador sem assinatura e as três rotas gratuitas (SignPath, winget, Microsoft Store em MSIX). Use ao trabalhar em CI, workflows, empacotamento, versão, updater, README de instalação ou qualquer tarefa dos marcos 8 e 9.
---

# Build, distribuição e atualização

Fonte: `docs/architecture.md` (seção 13), ADR-0002, ADR-0014 e ADR-0015. Todo o caminho de entrega usa serviço gratuito para código aberto.

## Regras que não mudam
- **Nada que custe.** Sem certificado pago, runner maior, servidor ou domínio. `node scripts/check-zero-cost.mjs` lê os workflows e barra runner fora da lista gratuita e segredo não previsto.
- **Release, tag, segredo e repositório são atos humanos.** Você prepara; o humano dispara. Os guardas pedem confirmação para `gh release`, `gh secret`, `git tag v…` e `gh repo create`.
- **A chave privada do updater nunca entra no repositório**, em log, em relatório ou em arquivo de configuração. Fica como segredo do CI e em cópia offline do mantenedor. Perder a chave significa não conseguir mais atualizar as instalações existentes.
- **Editar `.github/workflows/` pede confirmação humana.** Explique a mudança antes.

## Antes de escrever
Confira a documentação atual (subagente `docs-researcher`):
- instalador Windows e updater do Tauri: https://v2.tauri.app/distribute/windows-installer/ e https://v2.tauri.app/plugin/updater/
- a ação `tauri-action` e a versão atual de cada action usada
- cobrança do GitHub Actions: https://docs.github.com/en/billing/concepts/product-billing/github-actions

## Pacote
- Windows x64, instalador NSIS (`setup.exe`), por usuário, em `%LOCALAPPDATA%`: não pede administrador.
- O WebView2 só é baixado se faltar, sem aumentar o instalador.
- Nenhum modelo de fala no instalador.
- Windows ARM64 fica para depois.

## Pipeline
- **Todo push e pull request:** `node scripts/verify.mjs --full --check` em `windows-latest` (`.github/workflows/ci.yml`).
- **Toda tag de versão:** `tauri-action` compila, assina com a chave do updater, gera o `latest.json` e cria a release como rascunho.
- **Publicação:** só depois de teste manual do instalador pelo humano.
- Actions fixadas por SHA de commit, com a versão em comentário. Permissões mínimas no workflow.
- Segredos aceitos estão em `scripts/config/policy.json`. Nenhuma chave de IA ou de nuvem, nunca.

## Atualização
- No canal do GitHub, o app consulta `releases/latest/download/latest.json` ao abrir.
- A assinatura do updater é obrigatória.
- Instalação em modo `passive`, e nunca com tarefa em andamento.
- Na Microsoft Store, quem atualiza é o Windows; o build da Store sai sem o updater.
- Versão em SemVer. A base curada tem versão própria.

## O problema do instalador sem assinatura
Diga isto com todas as letras no README de instalação, sem amenizar:
- **SmartScreen:** instalador sem assinatura baixado pelo navegador mostra "O Windows protegeu o computador"; o usuário clica em "Mais informações" e "Executar assim mesmo".
- **Smart App Control:** no Windows 11 com o recurso ligado, app sem assinatura é bloqueado, sem exceção por aplicativo.
- O README publica o SHA-256 de cada instalador, para o usuário conferir o que baixou.

## As três fases, todas sem custo
1. **GitHub Releases sem assinatura** (marco 8).
2. **SignPath Foundation e winget** (marco 9). A SignPath exige licença aprovada pela OSI, nenhum componente proprietário, projeto ativo e já lançado, política de assinatura publicada e dois fatores; a aprovação não é garantida e o editor exibido é a SignPath Foundation. O winget aceita instalador sem assinatura; se o SmartScreen aparece nesse caminho é a verificação V6.
3. **Microsoft Store em MSIX** (marco 9). O Tauri só gera EXE e MSI; o MSIX sai da ferramenta da comunidade `tauri-windows-bundle`, cuja maturidade é a verificação V7. Antes, a prova de conceito V5: um app em MSIX consegue iniciar o CLI do agente instalado fora do pacote? Sem isso, a versão da Store perde o modo assinatura.

Publicar na Store como EXE ou MSI não serve: nesse formato a assinatura fica por conta do desenvolvedor.

Nenhuma dessas rotas é garantida. Não prometa data nem resultado no README.

## Dependências e licenças
- `cargo deny` no CI: licenças aceitas, vulnerabilidades, fontes. Auditoria das dependências npm.
- A SignPath exige que nada proprietário entre no pacote: dependência nova com licença fora da lista de `deny.toml` é bloqueador.
- Versões travadas (`Cargo.lock`, `pnpm-lock.yaml`) commitadas.

## Testes
- O teste de ponta a ponta roda inteiro no CI em Windows (importar, transcrever, analisar com provedor falso, conversar), antes de release.
- Instalação em máquina limpa é teste manual do humano; descreva o roteiro no relatório.

## Antes de entregar
- `node scripts/check-zero-cost.mjs` passa.
- Nenhum segredo no diff. Nenhum caminho da sua máquina em workflow.
- O relatório diz o que foi testado de verdade e o que só o humano pode testar (instalar, publicar, assinar).
