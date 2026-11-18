# Pendências

Tudo que ainda não foi decidido ou verificado. Quando um item se resolve, a resposta vira ADR (decisão) ou relatório de spike (verificação) e a linha sai daqui.

Agente: se a sua tarefa depende de um item desta página, pare e avise. Não escolha pelo humano e não trate suposição como fato.

## Decisões que são do humano

| # | Decisão | Bloqueia | Observação |
|---|---|---|---|
| D1 | Nome do app e do repositório | Marco 0 (o `BOOTSTRAP.md` pergunta) | — |
| D2 | Licença do código e licença do conteúdo da base | Marco 0 para o código; marco 6 para a base | Sugestão: Apache-2.0 e CC BY 4.0. Para a SignPath, precisa ser licença aprovada pela OSI, sem licenciamento duplo comercial |
| D3 | Base curada no mesmo repositório do app ou em repositório separado | Marco 6 | A arquitetura assume repositório próprio com releases assinadas |
| D4 | Qual metodologia de venda entra primeiro na rubrica | Marco 5 | Começar por uma venda só, a do próprio mantenedor |
| D5 | Suportar Windows 10 e 11 ou só o 11 | Marco 8 | A arquitetura assume os dois |
| D6 | Repositório público desde o início ou só na primeira release | Marco 0 | Runner padrão do GitHub Actions é gratuito em repositório público; em privado há cota mensal |

## Decisões técnicas a tomar no caminho (viram ADR na tarefa indicada)

| # | Decisão | Onde |
|---|---|---|
| T1 | Tipos de IPC: DTOs na casca ou `derive` do specta nos tipos do domínio | Tarefa da casca Tauri (marco 0) |
| T2 | Lista de licenças aceitas em `deny.toml` | Tarefa de CI (marco 0) |
| T3 | Runtime assíncrono e forma da fila de tarefas em `application` | Primeira tarefa do marco 1 |
| T4 | Modelo de fala padrão, depois do benchmark com cinco gravações | Marco 1 ou 4 |

## Verificações técnicas pendentes (cada uma vira spike)

| # | Pergunta | Precisa estar respondida antes de |
|---|---|---|
| V1 | O Parakeet v3 roda no sherpa-onnx com a configuração de transducer? | Marco 1 (spike T-0005) |
| V2 | Como o ACP declara que o cliente não oferece escrita nem terminal? | Marco 3 |
| V3 | Um app Windows consegue iniciar o CLI dentro do WSL com os caminhos traduzidos? | Marco 3 |
| V4 | O Media Foundation abre WebM com Opus nas versões atuais do Windows? | Marco 1 (não bloqueia: MP4/AAC é o caminho principal) |
| V5 | Um app empacotado em MSIX consegue iniciar um CLI instalado fora do pacote? | Marco 9 |
| V6 | O instalador sem assinatura, quando vem pelo winget, dispara o SmartScreen? | Marco 9 |
| V7 | A ferramenta `tauri-windows-bundle` está madura o bastante para publicar na Store? | Marco 9 |
| V8 | Dois ONNX Runtime no mesmo binário (sherpa-onnx + transcribe-rs) conflitam? | Só se o adaptador alternativo for necessário |

## Pendências do harness e do Maestri (conferir na primeira semana de uso)

| # | Pergunta | Como conferir |
|---|---|---|
| H1 | O plano gratuito do Maestri permite andares e bandas na quantidade que o fluxo pede? | Criar dois andares e uma banda; se não der, usar `git worktree` e cabos |
| H2 | Onde o Maestri cria o andar (dentro ou ao lado do projeto) e se o `CLAUDE.md` carrega duas vezes | No primeiro andar, rode `/context` no Claude; se aparecer duas vezes, veja `maestri/MAESTRI_SETUP.md` |
| H3 | Em que shell o Maestri roda os hooks de andar no Windows | Rodar o Setup uma vez e ler a saída; os scripts são Node e não dependem do shell |
| H4 | Sintaxe de criação de Responsabilidade e de mensagem entre agentes pela CLI | `maestri --help` e a skill `/maestri-manager` |
| H5 | Versões das actions do CI e fixação por SHA | Tarefa de CI (marco 0) |
| H6 | O Claude Code pede confiança em cada pasta de andar? Os guardas carregam lá? | No primeiro andar: aceitar o diálogo de confiança, rodar `/hooks` e tentar editar `docs/board/tasks/` (o guarda deve negar) |

## Riscos acompanhados

| Risco | Chance | Resposta |
|---|---|---|
| Sem assinatura, o Windows avisa ou bloqueia | Certa na primeira fase | Três rotas gratuitas em sequência: SignPath, winget, Microsoft Store |
| Provedor muda a regra de uso da assinatura | Alta | Porta única, chave de API sempre disponível, `providers.json` atualizável sem lançar o app |
| Transcrição em pt-BR erra demais em reunião real | Média | Benchmark antes de fixar o modelo; modelo trocável; correção manual de trecho |
| Separação de falantes troca vendedor e cliente | Média | Troca de falante em um clique, com métricas recalculadas |
| Rust atrasa o projeto | Média | Marcos pequenos; gatilho de quatro semanas para rever a casca |
| Adaptadores ACP pedem Node | Média | Adaptador headless do Claude como segundo caminho |
| CLI instalado só no WSL | Alta na máquina do mantenedor | Prova de conceito no marco 3 |
| Base curada rasa | Média | Começar por uma venda só, com rubrica testada em reuniões reais |
| Análise muda a cada execução | Alta | Métricas calculadas, evidência obrigatória, análise imutável com versão |
