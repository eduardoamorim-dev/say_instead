---
status: accepted
date: 2026-11-18
---

# ADR-0005: Interface em React, TypeScript, Tailwind e shadcn/ui

## Contexto
A interface roda dentro do WebView2 como página estática. O mantenedor já trabalha com React e TypeScript e usa disciplina de tokens em outro projeto.

## Decisão
React, TypeScript em modo estrito e Vite; Tailwind CSS v4 com tokens em variáveis CSS; shadcn/ui sobre Radix; TanStack Query, Router e Virtual; Zustand em pouca quantidade; i18next com pt-BR e inglês; react-markdown com sanitização para texto de IA.

## Alternativas consideradas
- **Svelte ou Solid.** Pacote menor; menos componentes prontos e curva de aprendizado a mais.
- **Next.js.** Não se aplica: não há servidor Node dentro do Tauri.
- **MUI ou Mantine.** Componentes prontos; o código não fica no repositório.

## Consequências
- Os componentes base ficam no repositório, sob controle do projeto.
- Nenhum valor arbitrário de estilo: só tokens.
- Texto visível sempre por chave de tradução.
- Resposta de modelo nunca vira HTML cru.
- A interface fala com o núcleo só pelos comandos tipados em `ui/src/ipc/`.

## Gatilho de revisão
Nenhum previsto.
