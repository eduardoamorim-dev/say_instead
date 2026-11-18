# Arquitetura — {{APP_NAME}}

Versão condensada para agentes, tirada do documento completo de 18/11/2026:
https://claude.ai/artifact/1bTPbVBRsR517B4xiyy2gm (comparações, trade-offs e fontes estão lá).

Este arquivo é a fonte da verdade no repositório. Mudança aqui exige ADR (`docs/adr/`) e aprovação humana.

## 1. O que é
O app roda só no Windows, recebe o arquivo de vídeo de uma reunião de venda, transcreve no próprio computador e abre uma conversa de análise usando a IA que o usuário já tem. É de código aberto e não pode gerar custo para quem o mantém.

**Entra na primeira versão**
- Importar arquivo de vídeo ou áudio do disco (sem link, sem gravação ao vivo).
- Transcrever localmente em português, com tempo e falante.
- Guardar transcrição, análise e conversa. O vídeo nunca é copiado nem armazenado.
- Analisar com uma base curada de vendas, versionada no GitHub.
- Conversar sobre a reunião com o provedor escolhido: CLI de agente, chave de API ou modelo local.
- Instalar no Windows 10 e 11 (64 bits) sem pedir administrador.

**Fica de fora:** macOS e Linux; qualquer serviço pago pelo projeto; gravação ao vivo, bot em chamada, coaching em tempo real; conta de usuário, sincronização, colaboração; integração com CRM, e-mail e agenda.

## 2. Atributos de qualidade
As metas numéricas são alvos a validar em benchmark, não medições.

| Atributo | Meta | Como se verifica |
|---|---|---|
| Custo do projeto | Zero, de forma permanente | `scripts/check-zero-cost.mjs`; lista de serviços, todos gratuitos para código aberto |
| Privacidade | Áudio e vídeo nunca saem da máquina; só texto vai ao provedor escolhido | Teste de rede: só aparecem o provedor, o GitHub e o download de modelos |
| Plataforma | Windows 10 e 11, 64 bits | CI compila e testa em Windows a cada mudança |
| Desempenho | 1 h de reunião transcrita em menos de 10 min numa CPU de 4 núcleos | Benchmark fixo com áudios de referência |
| Extensibilidade | Novo provedor ou motor de transcrição sem tocar no domínio | Cada um é um adaptador atrás de uma porta |
| Resiliência | Tarefa longa cancelável e retomável; fechar o app não corrompe dados | Teste que mata o processo no meio da transcrição |
| Rastreabilidade | Toda afirmação da análise aponta para um trecho com tempo | Validação automática da saída estruturada |

## 3. Princípios
Quando uma escolha de tecnologia contrariar um deles, o princípio ganha.

1. **Custo zero.** Toda infraestrutura vem de serviço gratuito para código aberto. Limitação da opção gratuita se documenta, não se compra.
2. **Local-first.** Os dados moram no disco do usuário e o app funciona sem rede, exceto para falar com a IA.
3. **O núcleo é biblioteca.** Toda a lógica vive em crates Rust que não conhecem o Tauri. A casca só traduz cliques em chamadas.
4. **Portas e adaptadores.** O domínio declara o que precisa do mundo como traits. Cada tecnologia entra como adaptador. As dependências apontam para dentro. O que é específico do Windows fica em adaptador.
5. **Provedor é detalhe.** Nenhum tipo do domínio cita Claude, OpenAI ou Gemini. Trocar provedor não exige reescrita.
6. **Tudo que demora é tarefa.** Transcrição, download de modelo e análise rodam com progresso, cancelamento e retomada, fora da thread da interface.
7. **Texto aberto.** Banco em SQLite, base em Markdown, exportação em Markdown e JSON. O usuário lê os próprios dados sem o app.
8. **Menor privilégio.** A interface não acessa disco, rede nem segredos. Agentes de IA rodam sem escrita e sem execução.
9. **Decisão registrada.** Cada escolha vira um ADR curto: contexto, decisão, consequências.

## 4. Visão geral
Três camadas dentro do computador e só duas saídas para fora (downloads e o provedor de IA).

```
interface (React no WebView2)
      │  comandos tipados + canais de progresso
casca (src-tauri: comandos, canais, capabilities, updater)
      │  chamadas de função
núcleo (crates Rust)
  application ─ casos de uso e fila de tarefas
  domain ────── tipos, regras e portas (traits)
  speech · providers · storage · knowledge ─ adaptadores
      │                         │
  GitHub Releases e         provedor de IA: HTTP com chave,
  servidores de modelos     CLI de agente (ACP) ou Ollama local
```

**Fluxo principal**
1. O usuário arrasta um vídeo; a interface chama o comando de importação.
2. O núcleo cria uma tarefa que decodifica, detecta fala, transcreve, separa falantes e grava os trechos.
3. A interface acompanha o progresso por canal e mostra a transcrição.
4. O usuário pede a análise; o núcleo monta o contexto e chama o provedor escolhido.
5. A resposta chega em fluxo, é validada contra o esquema e gravada.
6. A conversa reaproveita o mesmo contexto e o relatório já gerado.

## 5. Organização do código

```
crates/
  domain/        tipos e regras (Meeting, Segment, Analysis) e as portas (traits)
  application/   casos de uso e fila de tarefas
  speech/        adaptadores de áudio, transcrição e falantes
  providers/     adaptadores de IA: ACP, chave de API, modelo local
  storage/       SQLite, migrações, cofre de segredos
  knowledge/     leitura, validação e atualização da base curada
src-tauri/       casca: comandos, canais, capabilities, updater
ui/              React + TypeScript
evals/           transcrições de referência e avaliações
docs/adr/        decisões registradas
```

**Regra de dependência** (verificada por `scripts/check-arch.mjs`)
- `domain` não depende de nenhum crate do projeto nem de biblioteca de infraestrutura.
- `application` depende só de `domain`.
- Os quatro crates de adaptadores dependem de `domain` e implementam as portas dele.
- `src-tauri` monta tudo na inicialização e é o único que depende de `tauri`.

**Portas**

| Porta (trait) | O que promete | Adaptadores previstos |
|---|---|---|
| `MediaDecoder` | Abre um arquivo e devolve áudio mono em 16 kHz | Symphonia; Media Foundation como reserva |
| `SpeechToText` | Áudio vira trechos com tempo | sherpa-onnx; transcribe-rs |
| `Diarizer` | Diz quem falou em cada trecho | sherpa-onnx |
| `AnalysisProvider` | Contexto e pergunta viram resposta em fluxo | ACP, chave de API, Ollama |
| `MeetingRepository` | Guarda e busca reuniões, análises e conversas | SQLite |
| `SecretStore` | Guarda chaves fora do banco | Cofre do sistema operacional |
| `KnowledgeSource` | Entrega a base curada na versão ativa | Pasta local, GitHub Releases |
| `ModelStore` | Baixa, verifica e localiza modelos | HTTP com checksum |

**Fronteira com a interface**
- A interface chama comandos e recebe progresso e texto em fluxo por canais do Tauri.
- Tarefa longa segue um padrão único: o comando devolve um `job_id`, o progresso chega pelo canal e `cancel_job` interrompe.
- Os tipos TypeScript são gerados dos comandos Rust com tauri-specta, em `ui/src/ipc/`. Só essa pasta importa `@tauri-apps/*`.

## 6. Mídia e transcrição
Pipeline local de cinco etapas, como tarefa com checkpoint a cada etapa:

1. **Decodificar.** Lê o arquivo onde ele está e extrai áudio mono 16 kHz para um temporário.
2. **Detectar fala.** Silero VAD descarta silêncio e corta em blocos curtos.
3. **Transcrever.** Cada bloco vira texto com tempo.
4. **Separar falantes.** Segmenta por voz e agrupa em Falante 1, Falante 2…
5. **Juntar.** Cada trecho recebe o falante pela sobreposição de tempo. O usuário marca uma vez quem é o vendedor.

O temporário é apagado no fim e também na abertura seguinte do app.

- **Motor de fala:** crate oficial `sherpa-onnx` (2.0.1 em nov/2026), cobrindo transcrição, VAD e falantes com uma dependência nativa. `transcribe-rs` fica como adaptador alternativo, não como par. `whisper-rs` está fora no Windows (conflito de runtime MSVC relatado pelo Whispering).
- **Decodificação:** Symphonia por padrão (MP4/AAC-LC); o que ele recusar vai para o Media Foundation do Windows, isolado no adaptador. ffmpeg fica fora (binário grande, LGPL/GPL). WebM com Opus ainda não tem solução confirmada: se nenhum abrir, o app pede conversão.
- **Modelos:** nenhum vem no instalador. Um manifesto versionado lista URL, tamanho e SHA-256; o download aceita retomada e o hash é conferido antes do uso. Os arquivos ficam nos servidores de quem os publica.

| Modelo | Função | Tamanho aproximado (a conferir no manifesto real) |
|---|---|---|
| Parakeet TDT 0.6B v3, INT8 | Transcrição em 25 idiomas, português incluso | 680 MB |
| Whisper large-v3-turbo | Alternativa selecionável | 1,6 GB |
| Silero VAD | Detecção de fala | 2 MB |
| pyannote-segmentation-3.0 + modelo de embedding | Separação de falantes | 45 MB somados |

O modelo padrão só é fixado depois de um benchmark com cinco gravações reais (qualidade em pt-BR e erro de falante com fala sobreposta).

## 7. Dados locais
Um único arquivo SQLite na pasta de dados do app, acessado só pelo núcleo. `rusqlite` com SQLite embutido e FTS5; consulta roda fora da thread da interface.

| Tabela | Guarda | Observação |
|---|---|---|
| `meeting` | Título, data, duração, idioma, estado | O vídeo não entra; no máximo o nome do arquivo de origem |
| `participant` | Nome, foto, papel (vendedor ou cliente) | Reaproveitado entre reuniões |
| `speaker` | Rótulo do falante naquela reunião | Liga a voz detectada a um participante |
| `segment` | Início, fim, texto, falante | Indexado para busca textual |
| `analysis` | Resultado estruturado em JSON | Imutável; refazer cria outra linha; grava versão da base, da rubrica e o modelo |
| `finding` | Critério, veredito, evidências, sugestão | Permite comparar reuniões ao longo do tempo |
| `conversation`, `message` | O chat sobre a reunião | Registra provedor e modelo de cada resposta |
| `job` | Tipo, etapa, progresso, erro | Base para retomar tarefas |
| `knowledge_pack` | Versão instalada, hash, origem | Uma linha por versão baixada |
| `setting` | Preferências | Segredos ficam no cofre do sistema, nunca aqui |

**Regras:** migrações numeradas embutidas no binário, rodando na abertura dentro de transação; cópia `.bak` antes de migrar; modo WAL com uma conexão de escrita; identificadores UUIDv7; exportação em Markdown e em JSON (o JSON importa de volta). Criptografia do banco fica fora da primeira versão.

| Pasta | Conteúdo | Pode apagar? |
|---|---|---|
| `data/app.db` | O banco | Não |
| `data/attachments/` | Fotos de participantes | Não |
| `models/` | Modelos de transcrição | Sim; o app baixa de novo |
| `knowledge/<versão>/` | Base curada | Sim; o app restaura a versão embutida |
| `cache/` | Áudio temporário e pastas de sessão | Sim |

## 8. Camada de IA
O app nunca fala com um modelo diretamente: fala com a porta `AnalysisProvider`.

```rust
trait AnalysisProvider {
    fn descriptor(&self) -> ProviderDescriptor;   // nome, quem paga, capacidades
    async fn health(&self) -> ProviderHealth;      // instalado? logado? versão?
    async fn start(&self, ctx: SessionContext) -> Result<SessionHandle>;
    async fn send(&self, s: &SessionHandle, msg: UserMessage, sink: EventSink)
        -> Result<TurnOutcome>;
    async fn cancel(&self, s: &SessionHandle);
}
```

`SessionContext` leva instruções, transcrição e arquivos da base. `EventSink` recebe texto em pedaços, pedidos de ferramenta (sempre negados) e o fim do turno.

| Família | Como funciona | Quem paga | Ponto fraco |
|---|---|---|---|
| Agente via ACP | O app inicia o CLI do agente como subprocesso e conversa por JSON-RPC; o agente usa o login que já tem | A assinatura do usuário | Depende das regras de cada provedor |
| Chave de API | HTTP direto (crate `genai`), chave no cofre do sistema | Uso medido | Custo por reunião visível ao usuário |
| Modelo local | HTTP para o Ollama na própria máquina | Ninguém | Qualidade menor em análise longa |

**ACP:** crate oficial `agent-client-protocol` (5.3.0 em nov/2026), protocolo v1. Fluxo: `initialize`, `session/new`, `session/prompt`, série de `session/update`, resposta final com o motivo da parada. Cada conversa ganha uma pasta própria em `cache/` com `transcricao.md`, `instrucoes.md` e os arquivos da base; nada fora dela é exposto. O app não declara capacidade de escrita nem de terminal e responde "negar" a todo `session/request_permission`.

**Situação dos provedores (nov/2026; envelhece rápido, por isso mora em `providers.json` na base curada, não no código):** ChatGPT/Codex permite uso do plano (`codex app-server`, `codex-acp`); Claude: o app não pode oferecer login do claude.ai, mas o Claude Code já logado pelo usuário funciona e consome o plano dele; Gemini: assinatura não funciona em app de terceiros desde 18/06/2026, só chave de API; GitHub Copilot: permitido pelo Copilot SDK; Ollama: local.

**Outros pontos:** os adaptadores ACP do Claude e do Codex pedem Node; se isso atrapalhar usuários reais, o segundo adaptador é o headless do Claude (`claude -p --output-format stream-json`). `health()` verifica CLI, versão, Node e um turno mínimo. O app nunca lê nem copia arquivos de credencial dos CLIs. CLI instalado só no WSL é item em aberto (prova de conceito no marco 3).

## 9. Base de conhecimento
A inteligência de vendas é um pacote de arquivos Markdown no formato Agent Skills, publicado por GitHub Releases, que o app baixa e troca sem versão nova do app.

```
knowledge-pack/
  manifest.json          versão, versão mínima do app, hash de cada arquivo (assinado)
  charter-template.md    perguntas sobre oferta, cliente ideal, preço e objeções
  rubric/rubric.md       critérios e escala
  rubric/schema.json     formato da saída estruturada
  skills/<tema>/SKILL.md abertura, descoberta, objecao-de-preco, oferta, proximo-passo…
  providers.json         situação de cada provedor de IA
  sources.md             de onde veio cada ideia
  evals/                 transcrições sintéticas com gabarito
```

- **Formato:** uma pasta por skill com `SKILL.md`; `name` até 64 caracteres (minúsculas e hífens, igual à pasta); `description` até 1.024; corpo com menos de 500 linhas; detalhe em `references/`.
- **Charter do usuário:** arquivo local com a venda dele (oferta, cliente ideal, preço, objeções, etapas). O pacote traz só o modelo de perguntas; as respostas ficam na máquina e entram em toda análise.
- **Atualização:** consulta as releases no máximo uma vez por dia ou por botão; confere SHA-256 de cada arquivo e a assinatura do manifesto com a chave pública embutida; instala em `knowledge/<versão>/`, troca o ponteiro e mantém a anterior. Uma versão vem embutida no app para funcionar offline no primeiro dia.
- **Governança:** toda afirmação aponta a origem em `sources.md` (resumo próprio, nunca trecho copiado); PR passa por validação de formato e pelas avaliações; mudar critério ou escala sobe a versão maior.
- **Segurança:** a base é entrada de prompt. Defesas: manifesto assinado, branch protegida com revisão, agentes sem escrita nem execução, e o app ignora qualquer pasta `scripts/` do pacote.

## 10. Motor de análise
Dois modos sobre o mesmo contexto: relatório estruturado (uma vez por reunião) e conversa livre.

- **Ordem fixa do contexto** (do mais estável ao mais variável, para aproveitar cache de prompt): instruções do papel e rubrica → skills da base → charter → métricas e transcrição com falante e tempo → tarefa ou pergunta.
- **Transcrição inteira no contexto**, sem busca vetorial. Reunião acima de três horas passa por resumo em blocos.
- **Métricas calculadas em Rust antes da IA:** proporção de fala de cada lado, número de perguntas do vendedor, maior monólogo, minuto em que o preço aparece. Entram no contexto como fatos.
- **Saída estruturada** (o esquema vem do pacote da base, não do código):

```json
{
  "outcome": "avancou | ficou_em_aberto | travou",
  "criteria": [{
    "id": "descoberta.dor",
    "verdict": "feito | parcial | faltou",
    "evidence": [{ "segment_id": "...", "quote": "..." }],
    "why": "...",
    "say_instead": "..."
  }],
  "top_focus": "um único comportamento para a próxima reunião"
}
```

- **Três verificações em toda resposta:** JSON válido no esquema; cada `segment_id` existe na reunião; cada citação aparece de fato no trecho apontado. Achado que falha é refeito uma vez; se falhar de novo, aparece como "sem evidência".
- **Conversa:** mesmo contexto mais o relatório; responde só com base na transcrição e cita o tempo de cada afirmação; a interface transforma tempo em link.
- **Avaliação em três camadas:** determinística (esquema, evidências, idioma) em todo commit, sem custo de IA; conjunto de referência (20 a 30 transcrições sintéticas com defeito plantado) quando base, rubrica ou prompt mudam, rodando na máquina de quem mantém, com a própria assinatura ou modelo local; revisão humana periódica. O CI só roda a primeira.
- **Não determinismo:** cada análise é imutável e registra modelo e versão da base.

## 11. Interface
Aplicação React de página única no WebView2. O desenho visual das telas é etapa posterior; aqui ficam as fundações.

| Camada | Escolha |
|---|---|
| Framework | React, TypeScript (estrito) e Vite. Sem Next.js |
| Estilo | Tailwind CSS v4 com tokens em variáveis CSS, sem valores arbitrários |
| Componentes base | shadcn/ui sobre Radix |
| Dados do núcleo | TanStack Query sobre os comandos tipados |
| Estado de tela | Zustand, em pouca quantidade |
| Rotas | TanStack Router |
| Lista longa | TanStack Virtual (uma hora de reunião passa de mil trechos) |
| Idiomas | i18next, pt-BR e inglês desde o início |
| Texto da IA | react-markdown com sanitização; resposta de modelo nunca vira HTML cru |

- **Tokens:** cor (fundo, superfície, borda, texto, texto secundário, destaque, sucesso, alerta, erro) em tema claro e escuro, contraste AA; cor de falante `speaker-1` a `speaker-4`, nunca como única pista; fonte do sistema, escala 12/14/16/20/24, transcrição em 16 px com entrelinha 1,6; espaço em escala de 4 px; dois raios, uma sombra; movimento de 150 a 200 ms respeitando a preferência de reduzir movimento.
- **Componentes de domínio:** `TranscriptView`, `FindingCard`, `ChatPanel`, `JobProgress`, `ProviderPicker`, `ModelDownload`, `SpeakerBadge`.
- **Quatro estados em toda tela:** vazio, carregando, erro com ação de saída, sucesso. Tarefa longa mostra etapa e porcentagem reais e sempre pode ser cancelada.
- **Telas:** primeira execução (modelo, provedor, charter); biblioteca; importação; reunião (transcrição, análise e conversa lado a lado); evolução; ajustes.

## 12. Segurança e privacidade

| Ameaça | Defesa |
|---|---|
| Texto da IA ou da transcrição injeta script | CSP restrita, Markdown sanitizado, capabilities mínimas, nenhum segredo na interface |
| Agente de IA executa comando ou altera arquivo | Pasta de sessão isolada, permissão sempre negada, sem escrita nem terminal |
| Fala do cliente contém instrução para o modelo | Transcrição delimitada como dado; com agente só de leitura, o dano máximo é uma resposta ruim |
| Base curada adulterada | Manifesto assinado, hash por arquivo, revisão obrigatória |
| Atualização falsa do app | Assinatura do updater do Tauri (obrigatória) |
| Modelo adulterado no download | SHA-256 conferido contra o manifesto |
| Vazamento de chave de API | Cofre do sistema (crate `keyring`); a chave nunca aparece em log, banco ou interface |
| Dependência maliciosa | Versões travadas e auditoria (`cargo deny`, auditoria npm) no CI |
| Vídeo sensível esquecido no disco | O vídeo nunca é copiado; o áudio temporário some no fim e na abertura seguinte |

**O que sai da máquina:** ao provedor de IA escolhido vão instruções, base, charter, transcrição e perguntas, em texto; ao GitHub e aos servidores de modelos só pedidos de download; aos autores do app, nada (sem telemetria). Antes da primeira análise em nuvem, o app mostra o que será enviado e para quem.

**LGPD (não é parecer jurídico):** quem decide gravar e analisar é o usuário; o app lembra do aviso de gravação na importação; a tela de envio deixa explícito o compartilhamento com o provedor; apagar uma reunião remove transcrição, análise, conversa e pasta de sessão de uma vez.

## 13. Build, distribuição e atualização
- **Serviços, todos gratuitos:** GitHub (repositório público, Actions em runner padrão, Releases, Pages); modelos hospedados por quem os publica; IA para desenvolver e avaliar é a assinatura de quem mantém ou modelo local. Sem servidor, domínio, telemetria ou certificado pago.
- **Pacote:** Windows x64, instalador NSIS por usuário em `%LOCALAPPDATA%` (não pede administrador); WebView2 baixado só se faltar; ARM64 fica para depois.
- **Pipeline:** em todo push, formatação, lint e testes em runner Windows; em toda tag de versão, `tauri-action` compila, assina com a chave do updater, gera `latest.json` e cria a release como rascunho; publicação depois de teste manual do instalador.
- **Sem assinatura de código:** o SmartScreen avisa e o Smart App Control do Windows 11 bloqueia. Certificado pago está fora.
- **Plano em três fases, todas sem custo:** (1) GitHub Releases sem assinatura, com o aviso explicado no README e o SHA-256 publicado; (2) pedido à SignPath Foundation e manifesto no winget; (3) Microsoft Store em MSIX (ferramenta `tauri-windows-bundle`), depois de provar que um app em MSIX consegue iniciar o CLI do agente instalado fora do pacote.
- **Atualização:** o app consulta `releases/latest/download/latest.json` ao abrir; assinatura do updater obrigatória; modo `passive`; nunca atualiza com tarefa em andamento. Perder a chave privada do updater impede atualizar as instalações existentes: ela fica como segredo do CI e em cópia offline. Na Store, o Windows atualiza e o build sai sem o updater.
- **Versões:** SemVer no app; a base curada tem versão própria e declara a versão mínima do app.

## 14. Testes e qualidade

| Nível | O que cobre | Como | Quando |
|---|---|---|---|
| Unidade | Regras do domínio, métricas, junção texto-falante, validação da saída | `cargo test` com adaptadores falsos em memória | Todo commit |
| Contrato de adaptador | Toda implementação de uma porta passa pela mesma bateria: fluxo, cancelamento, erro | Suíte genérica sobre o trait, com agente ACP falso | Todo commit |
| Referência de transcrição | Áudios curtos com texto esperado e taxa máxima de erro | Teste lento (`#[ignore]`), modelos em cache | Diário e antes de release |
| Migrações | Banco de cada versão antiga chega à atual sem perda | Bancos guardados como fixture | Todo commit |
| Interface | Componentes e os quatro estados de cada tela | Vitest e Testing Library, comandos simulados | Todo commit |
| Ponta a ponta | Importar, transcrever, analisar com provedor falso, conversar | WebDriver do Tauri | Antes de release |
| Avaliações de IA | Qualidade da análise | Scripts em `evals/` | Quando base, rubrica ou prompt mudam |
| Desempenho | Minutos por hora de áudio e pico de memória | Benchmark fixo | Antes de release |

- Rust: `cargo fmt`, `clippy` com avisos como erro, `cargo deny` para licenças e vulnerabilidades. Frontend: TypeScript estrito e ESLint.
- Cobertura não é meta. A meta é que toda porta tenha contrato testado.
- Erros tipados por camada, convertidos em códigos estáveis que a interface traduz. Logs estruturados em arquivo rotativo, sem transcrição e sem chave. Botão "exportar diagnóstico".
- O repositório só recebe gravações encenadas e transcrições sintéticas.

## 15. Riscos e pendências
Os riscos, as decisões que são do humano e as verificações técnicas pendentes estão em `docs/open-questions.md`. Gatilho para rever a casca: se o Rust travar o avanço por mais de quatro semanas seguidas, a casca muda para Electron (ADR-0003).
