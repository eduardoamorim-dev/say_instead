---
name: ui-frontend
description: Como construir a interface React do app em ui/ - fronteira de IPC tipada, tokens de design com Tailwind v4, componentes shadcn/ui, quatro estados obrigatórios por tela, i18n pt-BR e inglês, TanStack Query, Router e Virtual, sanitização de texto de IA e testes de componente. Use ao criar ou alterar telas, componentes, estilos, traduções, rotas ou qualquer arquivo em ui/.
---

# Interface

Fonte: `docs/architecture.md` (seção 11), ADR-0005. Regras por caminho em `.claude/rules/ui.md`. A interface é uma aplicação React de página única dentro do WebView2. O desenho visual das telas é etapa posterior; aqui valem as fundações.

## Antes de escrever
Confira a documentação atual das bibliotecas que a tarefa usa (subagente `docs-researcher`): Tailwind CSS v4, shadcn/ui, TanStack Query, Router e Virtual, i18next, react-markdown. Configuração de Tailwind e de shadcn/ui mudou bastante entre versões; não escreva de memória.

## A fronteira
- A interface não lê disco, não faz HTTP, não guarda segredo. Tudo é comando do núcleo.
- Só `ui/src/ipc/` importa `@tauri-apps/*` (`check-arch` barra o resto). Essa pasta tem os tipos e funções gerados dos comandos Rust e, se preciso, adaptadores finos em volta deles.
- Tipo gerado não se edita. Mudou o contrato? Mude no Rust e regenere.
- Em teste, a pasta `ipc` é substituída por simulação. Componente nunca chama o Tauri direto.

## Dados e estado
- **Dados do núcleo:** TanStack Query sobre as funções de `ipc`. Chave de consulta estável, invalidação explícita depois de mutação.
- **Tarefa longa:** o comando devolve `job_id`; o progresso chega por canal e alimenta o estado da tela; há botão de cancelar que chama `cancel_job`.
- **Estado de tela:** local primeiro; Zustand só quando várias partes distantes precisam do mesmo estado.
- **Rotas:** TanStack Router, com parâmetros tipados.

## Os quatro estados
Toda tela e todo painel que busca dados trata, explicitamente:
1. **Vazio:** diz o que é o lugar e qual é o primeiro passo.
2. **Carregando:** esqueleto ou progresso. Tarefa longa mostra etapa e porcentagem reais.
3. **Erro:** mensagem traduzida a partir do código estável do núcleo, com uma ação de saída (tentar de novo, escolher outro arquivo, abrir ajustes).
4. **Sucesso.**

Componente novo tem teste para cada estado que implementa.

## Tokens
- Tailwind v4 com tokens em variáveis CSS. Nenhum valor arbitrário de cor, espaço, raio ou tamanho.
- Grupos: cor (fundo, superfície, borda, texto, texto secundário, destaque, sucesso, alerta, erro); cor de falante `speaker-1` a `speaker-4`; tipografia na fonte do sistema, escala 12, 14, 16, 20, 24; espaço em escala de 4 px; dois raios, uma sombra; movimento de 150 a 200 ms.
- Tema claro e escuro desde o início, com contraste AA.
- Transcrição em 16 px com entrelinha 1,6.
- Movimento respeita a preferência do sistema de reduzir movimento.
- Cor nunca é a única pista: o nome do falante aparece sempre junto.

## Componentes
- Base: shadcn/ui sobre Radix. O código do componente fica no repositório; adicione só o que a tarefa usa.
- De domínio: `TranscriptView`, `FindingCard`, `ChatPanel`, `JobProgress`, `ProviderPicker`, `ModelDownload`, `SpeakerBadge`. Um componente de domínio recebe dados e funções por propriedade; não busca dados por conta própria, para ser testável.
- Lista de trechos é virtualizada (TanStack Virtual): uma hora de reunião passa de mil trechos.
- Acessibilidade: tudo operável por teclado, foco visível, rótulo em controle sem texto.

## Texto
- Nenhuma frase no código. Toda string visível é chave de tradução, com par em pt-BR e em inglês. Um teste falha se faltar par.
- Erro do núcleo chega como código; a tradução do código mora nos arquivos de idioma.
- Datas, números e durações formatados pelo idioma ativo.

## Texto não confiável
- Resposta de modelo e transcrição são dados de fora. Renderize com `react-markdown` e sanitização. Nunca `dangerouslySetInnerHTML`.
- Link em resposta de modelo só abre com esquema permitido, e fora do app.
- Tempo citado numa resposta vira link para o trecho; trecho inexistente não vira link.

## Qualidade
- TypeScript em modo estrito. `any` e `@ts-ignore` não são solução.
- Testes com Vitest e Testing Library, comandos simulados. Teste comportamento que o usuário vê, não detalhe de implementação.
- `pnpm run lint`, `typecheck` e `test` passam. O script `test` roda uma vez e sai.

## Antes de entregar
- `node scripts/check-arch.mjs` passa (fronteira de import).
- Os quatro estados existem e têm teste.
- Nenhuma frase literal, nenhum valor arbitrário de estilo.
- Tela conferida nos dois temas e nos dois idiomas; diga isso no relatório, com o que você de fato viu.
