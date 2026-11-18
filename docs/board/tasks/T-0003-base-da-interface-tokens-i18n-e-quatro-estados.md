---
id: T-0003
title: "Base da interface: tokens, i18n e quatro estados"
milestone: 0
area: ui
type: feature
status: backlog
depends_on: [T-0002]
branch: task/T-0003-base-da-interface-tokens-i18n-e-quatro-estados
---

## Objetivo
Deixar pronta a fundação da interface: tokens de design em tema claro e escuro, componentes base, dois idiomas e o padrão dos quatro estados de tela, para que as telas dos próximos marcos só componham.

## Contexto
- `docs/architecture.md`, seção 11 (Interface)
- ADR-0005
- Skill: `ui-frontend`
- Regras por caminho: `.claude/rules/ui.md`
- Confira a documentação atual do Tailwind v4, do shadcn/ui e do i18next antes de configurar

## Escopo
- Tailwind CSS v4 com os tokens da arquitetura como variáveis CSS: cor (incluindo `speaker-1` a `speaker-4`), tipografia, espaço, raio, sombra, movimento
- Tema claro e escuro seguindo o sistema, com troca manual
- shadcn/ui inicializado; só os componentes usados nesta tarefa
- i18next com pt-BR e inglês; nenhuma frase visível fora dos arquivos de tradução
- TanStack Router com uma rota inicial e TanStack Query configurado sobre a função de IPC existente
- Um componente de página que implementa os quatro estados (vazio, carregando, erro com ação de saída, sucesso) e é usado pela tela de `app_info`
- Regra de lint que barra frase literal em JSX e valor arbitrário de Tailwind, se houver plugin mantido para isso; se não houver, diga no relatório

## Fora de escopo
- Telas do produto (biblioteca, importação, reunião)
- Componentes de domínio (`TranscriptView`, `FindingCard` e os demais)
- Desenho visual final: aqui só entram os tokens

## Critérios de aceite
- [ ] Trocar o tema do sistema muda as cores do app sem recarregar
- [ ] Trocar o idioma muda todo texto visível; um teste falha se existir chave em pt-BR sem par em inglês
- [ ] A tela de `app_info` mostra os quatro estados, cada um coberto por teste de componente
- [ ] Contraste AA conferido para texto sobre fundo e sobre superfície nos dois temas (diga como conferiu)
- [ ] Movimento respeita a preferência de reduzir movimento do sistema
- [ ] Nenhum arquivo fora de `ui/src/ipc/` importa `@tauri-apps/*`

## Verificação
`node scripts/verify.mjs --full` verde. No relatório: lista dos tokens criados e o que ficou sem regra de lint.

## Notas
A fonte segue o sistema (Segoe UI Variable no Windows 11). Não adicione fonte empacotada.
