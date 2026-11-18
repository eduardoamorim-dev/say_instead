---
status: accepted
date: 2026-11-18
---

# ADR-0015: Distribuição gratuita em três fases

## Contexto
Instalador sem assinatura de código mostra o aviso do SmartScreen, e o Smart App Control do Windows 11 bloqueia sem exceção por aplicativo. Certificado pago está fora (ADR-0002) e o Azure Artifact Signing não atende o Brasil.

## Decisão
Três fases, todas sem custo:
1. GitHub Releases sem assinatura; o README explica o aviso e publica o SHA-256 de cada instalador.
2. Pedido à SignPath Foundation e manifesto no winget.
3. Microsoft Store em pacote MSIX, depois de uma prova de conceito.

O pacote é instalador NSIS por usuário, que não pede administrador.

## Alternativas consideradas
- **Certificado pago desde o início.** Sem aviso; custo anual.
- **Só a Store.** A Microsoft hospeda e assina; depende de MSIX, que o Tauri não gera, e de uma verificação ainda pendente.

## Consequências
- Os primeiros usuários veem o aviso; parte dos usuários de Windows 11 fica bloqueada.
- A SignPath exige licença aprovada pela OSI, nenhum componente proprietário, projeto já lançado e política de assinatura publicada; a aprovação não é garantida e o editor exibido é a SignPath Foundation.
- O MSIX sai de ferramenta da comunidade (`tauri-windows-bundle`), cuja maturidade precisa ser conferida (V7).
- A fase 3 depende de um app em MSIX conseguir iniciar o CLI do agente instalado fora do pacote (V5); sem isso, a versão da Store perde o modo assinatura.
- Nenhuma rota é única: código e releases são portáveis.

## Gatilho de revisão
As três rotas falharem, ou um patrocínio cobrir o certificado.
