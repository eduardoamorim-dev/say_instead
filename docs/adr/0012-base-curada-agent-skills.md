---
status: accepted
date: 2026-11-18
---

# ADR-0012: Base curada em Agent Skills, com releases assinadas

## Contexto
A inteligência de vendas precisa evoluir mais rápido que o app e aceitar contribuição. Ela também é entrada de prompt: um arquivo malicioso viraria injeção para todos os usuários.

## Decisão
A base é um pacote de arquivos Markdown no formato Agent Skills, em repositório próprio no GitHub. Cada versão sai como release com manifesto assinado e hash por arquivo. O app traz uma versão embutida, consulta as releases no máximo uma vez por dia e mantém a versão anterior para desfazer. O charter do usuário fica só na máquina dele.

## Alternativas consideradas
- **`git pull` embutido.** Sempre o conteúdo mais recente; dependência pesada, risco de estado quebrado e nenhuma assinatura.
- **Só embutida no binário.** Zero rede; corrigir uma frase exige lançar o app de novo.

## Consequências
- Versões imutáveis, verificáveis e reversíveis, sem servidor.
- Publicar exige gerar release.
- O mesmo pacote funciona dentro de outros agentes, mesmo sem o app.
- O app ignora qualquer pasta `scripts/` do pacote.
- Cada análise registra a versão da base e da rubrica; mudar critério ou escala sobe a versão maior.
- Toda afirmação aponta a origem em `sources.md`, como resumo próprio.
- Repositório separado ou junto do app é decisão pendente (D3).

## Gatilho de revisão
Nenhum previsto.
