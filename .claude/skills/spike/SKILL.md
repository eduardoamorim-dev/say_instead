---
name: spike
description: Conduz uma investigação técnica curta que responde a uma pergunta com um experimento mínimo e um relatório, sem produzir código de produto. Use para tarefas de tipo spike e para as verificações pendentes de docs/open-questions.md (por exemplo, se um modelo roda numa biblioteca, se uma API do Windows abre um formato, se um CLI pode ser iniciado de certo jeito).
argument-hint: "[T-NNNN]"
---

# Conduzir um spike

Tarefa: $ARGUMENTS

Um spike compra informação. O produto dele é uma resposta com evidência, não código que vai para o app.

## Regras
- **Uma pergunta.** Escreva-a no topo do relatório, de forma que a resposta seja sim, não, ou sim com ressalvas.
- **O menor experimento que responde.** Um programa de linha de comando, um teste, um script. Nada de interface, nada de arquitetura.
- **Código descartável, fora do produto.** Em `spikes/<id>/`, com workspace próprio para não entrar no do app (num `Cargo.toml` de spike, uma tabela `[workspace]` vazia). Nunca em `crates/`, `src-tauri/` ou `ui/`.
- **Caixa de tempo.** Se depois de três abordagens a pergunta continua aberta, pare e relate o que aprendeu. "Não consegui determinar" é resposta válida, desde que diga por quê.
- **Nada que custe.** Sem API paga, sem serviço novo. Modelo e arquivo grande ficam em pasta ignorada pelo git.
- **Dados sintéticos ou encenados.** Nenhuma gravação real.
- **Nada instalado globalmente** sem o humano confirmar.

## Passos
1. Leia a tarefa e a linha correspondente em `docs/open-questions.md`. Leia o ADR que depende da resposta.
2. Consulte a documentação atual com o subagente `docs-researcher`. Anote a versão exata de cada biblioteca.
3. Escreva o experimento. Fixe versões (`Cargo.lock` ou lockfile commitado dentro de `spikes/<id>/`).
4. Rode na plataforma-alvo: Windows x64. Resultado obtido em outro sistema não responde à pergunta; se você não está no Windows, diga isso e pare.
5. Meça o que a tarefa pede. Anote a máquina (CPU, memória, versão do Windows).
6. Repita uma vez para confirmar que o resultado se reproduz.

## Relatório (`docs/board/reports/<id>.md`)
```markdown
# <id> — <pergunta>

## Resposta
Sim | Não | Sim, com ressalvas. Uma frase.

## Como reproduzir
Comandos exatos, a partir de um checkout limpo.

## O que foi observado
Fatos, com a saída relevante: versões, configuração usada, números medidos, mensagens de erro.

## O que é inferência
O que você conclui além do observado, marcado como tal.

## O que não foi verificado
Casos que ficaram de fora.

## Impacto na arquitetura
Nada muda | Qual ADR precisa de revisão, e a proposta (use a skill write-adr).

## Próximo passo sugerido
A tarefa de produto que este resultado destrava, ou o próximo experimento.
```

## Fechamento
- Rode `node scripts/verify.mjs --full` (o código do spike não entra na verificação do produto, mas o resto do repositório precisa continuar verde).
- Entregue pela skill `finish-task`.
- Se a resposta derruba uma decisão, não conserte por conta própria: proponha o ADR e avise.
