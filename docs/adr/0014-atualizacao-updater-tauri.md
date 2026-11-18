---
status: accepted
date: 2026-11-18
---

# ADR-0014: Atualização pelo updater do Tauri com GitHub Releases

## Contexto
O app precisa se atualizar sem servidor próprio e sem que uma atualização falsa possa ser instalada.

## Decisão
O updater do Tauri consulta `releases/latest/download/latest.json` no GitHub ao abrir o app. A assinatura do updater é obrigatória, com chave gerada pelo mantenedor. A instalação usa o modo `passive` e nunca roda com tarefa em andamento.

## Alternativas consideradas
- **Servidor próprio de atualização.** Controle de canais e de adoção; custo e operação.

## Consequências
- Nenhum servidor.
- Perder a chave privada do updater significa não conseguir mais atualizar as instalações existentes. Ela fica como segredo do CI e em cópia offline, nunca no repositório.
- Na Microsoft Store, quem atualiza é o Windows; o build da Store sai sem o updater.
- O app usa SemVer.

## Gatilho de revisão
Nenhum previsto.
