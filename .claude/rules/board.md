---
paths:
  - "docs/board/**"
  - "docs/roadmap.md"
---

# Regras para o quadro

- O estado de uma tarefa só muda com `node scripts/task.mjs move`, em `main`. Não edite a linha `status:` à mão.
- `tasks/` é do Maestro, `reports/` é do Implementador, `reviews/` é do Revisor. Não escreva na pasta do outro.
- `log.md` é escrito pelo script.
- Tarefa em `ready` ou adiante não tem o escopo ampliado. Trabalho novo é tarefa nova.
- Critério de aceite é verificável por comando, teste ou observação objetiva.
- Formato e exemplos em `docs/board/README.md`; estados e pré-condições em `docs/workflow.md`.
