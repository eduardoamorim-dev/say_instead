---
paths:
  - "ui/**/*.{ts,tsx,css}"
  - "ui/package.json"
  - "package.json"
---

# Regras para a interface

- Só `ui/src/ipc/` importa `@tauri-apps/*`. O resto chama as funções tipadas dessa pasta. Os tipos gerados não se editam à mão.
- A interface não lê disco, não faz HTTP e não guarda segredo. Precisa de algo? É um comando do núcleo.
- Nenhuma frase visível no código: toda string passa por chave de tradução, com par em pt-BR e em inglês.
- Só tokens: nada de cor, espaço, raio ou tamanho arbitrário (`w-[13px]`, `#3a3a3a`).
- Toda tela trata quatro estados: vazio, carregando, erro com ação de saída, sucesso.
- Tarefa longa mostra etapa e porcentagem reais e tem botão de cancelar.
- Texto vindo de modelo ou de transcrição passa por `react-markdown` com sanitização. Nunca `dangerouslySetInnerHTML`.
- Cor nunca é a única pista: o nome do falante sempre aparece junto da cor.
- Lista de trechos é virtualizada.
- Dados do núcleo por TanStack Query; estado de tela em Zustand só quando o estado local não basta.
- Componente novo tem teste dos estados que implementa. `any` e `@ts-ignore` não são solução.
- Skill da área: `ui-frontend`.
