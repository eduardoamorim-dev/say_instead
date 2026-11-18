# {{APP_NAME}}

App de desktop para Windows, de código aberto, que recebe o vídeo de uma reunião de venda, transcreve no próprio computador e abre uma conversa de análise com a IA que você já tem (assinatura, chave de API ou modelo local). O vídeo nunca é copiado nem enviado a lugar nenhum.

> **Estado:** em construção. Ainda não há versão para instalar. O roteiro está em [`docs/roadmap.md`](docs/roadmap.md).

## Princípios
- **Custo zero para o projeto:** nenhum servidor, domínio, certificado ou API paga. A IA é a que você já tem.
- **Local-first:** áudio e vídeo ficam na sua máquina. Só o texto da transcrição vai ao provedor de IA que você escolher.
- **Sem telemetria.**

## Documentação
- [Arquitetura](docs/architecture.md) e [decisões registradas](docs/adr/README.md)
- [Roteiro](docs/roadmap.md)
- [Pendências e riscos](docs/open-questions.md)

## Como este repositório é construído
O código é escrito por agentes de IA orquestrados, com revisão e aterrissagem humanas.
- [Fluxo de trabalho](docs/workflow.md): papéis, estados da tarefa, portões
- [Harness](docs/harness.md): guardas, verificação e como evoluí-los
- [Quadro](docs/board/README.md): tarefas, relatórios e revisões
- [Estrutura no Maestri](maestri/MAESTRI_SETUP.md)

## Desenvolvimento
Requer Windows 10 ou 11 (64 bits), Git, Node LTS, pnpm e Rust com a toolchain MSVC.

```
node scripts/doctor.mjs          # confere o ambiente
node scripts/verify.mjs          # verificação rápida
node scripts/verify.mjs --full   # a mesma verificação do CI
node scripts/task.mjs list       # quadro de tarefas
```

## Licença
Veja [`LICENSE`](LICENSE).
# say_instead
