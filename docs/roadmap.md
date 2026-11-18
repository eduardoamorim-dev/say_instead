# Roteiro — {{APP_NAME}}

Dez marcos, ordenados para que o app já resolva a dor principal no marco 3: transcrever uma reunião e conversar sobre ela. Nenhum exige gasto. Não há datas porque nenhuma foi definida.

Cada marco é fatiado em tarefas pela skill `plan-milestone` e só começa depois que o humano aprova o plano. Um marco termina quando o critério "Pronto quando" é demonstrado, não quando as tarefas acabam.

| Marco | Entrega | Pronto quando | Estado |
|---|---|---|---|
| 0. Fundação | Workspace, CI em Windows, janela vazia, primeiros ADRs | CI verde | proposto (T-0001 a T-0004 no backlog) |
| 1. Transcrever um arquivo | Importar MP4, decodificar, transcrever, mostrar texto com tempo; tarefa com progresso e cancelamento | Uma hora de MP4 vira texto num PC sem placa de vídeo dedicada | não planejado (spike T-0005 no backlog) |
| 2. Guardar e listar | SQLite, migrações, biblioteca de reuniões, busca | Fechar e abrir o app mantém tudo | não planejado |
| 3. Conversar por ACP | Cliente ACP com o Claude Code, pasta de sessão, chat em fluxo, prova do WSL | Pergunta sobre a reunião respondida, com toda permissão negada | não planejado |
| 4. Falantes e métricas | Separação de falantes, marcar o vendedor, métricas calculadas | Proporção de fala correta numa gravação encenada | não planejado |
| 5. Análise estruturada | Rubrica inicial, esquema, validação de evidência, cartões de achado | Relatório em que toda evidência abre o trecho certo | não planejado |
| 6. Base atualizável | Pacote, manifesto assinado, atualização, charter | Trocar a base sem trocar o app | não planejado |
| 7. Chave de API e Ollama | Segundo e terceiro adaptadores, cofre de chaves | O mesmo teste de contrato passa nos três | não planejado |
| 8. Primeira release | Instalador por usuário, atualizador, release no GitHub, README com o aviso do SmartScreen e o SHA-256 | Outra pessoa instala e analisa uma reunião sozinha | não planejado |
| 9. Instalação sem aviso | Pedido à SignPath, manifesto do winget, prova de conceito do MSIX para a Store | Pelo menos uma rota instala sem aviso do Windows | não planejado |

## Ordem e dependências
- 0 → 1 → 2 → 3 em sequência. O marco 3 fecha o primeiro ciclo útil.
- 4 depende de 1. 5 depende de 3 e 4. 6 depende de 5. 7 depende de 3. 8 depende de 5 (com 6 e 7 desejáveis). 9 depende de 8.
- Spikes de verificações pendentes (`docs/open-questions.md`) podem andar em paralelo com o marco anterior, porque não mexem em código de produto.

## Regra do marco
- No máximo `wipLimit` tarefas em andamento ao mesmo tempo (`scripts/config/harness.json`, hoje 2).
- Toda tarefa de adaptador começa pela porta, pelo falso em memória e pelo teste de contrato.
- Se um marco revelar que uma decisão da arquitetura está errada, a correção entra por ADR antes do código.
