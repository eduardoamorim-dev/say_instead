---
name: speech-pipeline
description: Como construir o pipeline local de mídia e transcrição no crate speech - decodificação com Symphonia e Media Foundation, detecção de fala, transcrição e separação de falantes com sherpa-onnx, junção texto-falante, download de modelos com manifesto e checksum. Use ao trabalhar em crates/speech, nas portas MediaDecoder, SpeechToText, Diarizer e ModelStore, ou em qualquer coisa que toque áudio, modelos de fala ou desempenho de transcrição.
---

# Pipeline de mídia e transcrição

Fonte: `docs/architecture.md` (seção 6), ADR-0006 e ADR-0007. Tudo roda na máquina do usuário. Áudio e vídeo nunca saem dela.

## As cinco etapas
1. **Decodificar** (`MediaDecoder`): lê o arquivo onde ele está e produz áudio mono em 16 kHz num temporário em `cache/`.
2. **Detectar fala:** Silero VAD descarta silêncio e corta em blocos curtos.
3. **Transcrever** (`SpeechToText`): cada bloco vira texto com tempo de início e fim.
4. **Separar falantes** (`Diarizer`): segmenta por voz e agrupa em falantes numerados.
5. **Juntar:** cada trecho de texto recebe o falante pela maior sobreposição de tempo. É regra pura, mora em `domain`, com teste de unidade.

O pipeline é uma tarefa longa com ponto de retomada a cada etapa (skill `rust-core`). O temporário é apagado no fim e na abertura seguinte do app.

## Regras que não mudam
- **O vídeo não é copiado.** Só o caminho é guardado, no máximo o nome do arquivo.
- **Nenhum modelo no instalador nem no git.** Download por manifesto, com retomada e SHA-256 conferido antes do primeiro uso.
- **Bibliotecas de fala só em `crates/speech`** (`check-arch` barra `sherpa*` e `symphonia*` fora dele).
- **Código do Windows só no adaptador de reserva** (Media Foundation), atrás da mesma porta.
- **Inferência e decodificação fora do executor assíncrono**, em thread própria, consultando cancelamento entre blocos.
- **Sem ffmpeg.** Nem binário, nem biblioteca.

## Decodificação
- Padrão: Symphonia. Cobre o caso comum (MP4 com AAC-LC, de Meet e Zoom).
- Reserva: Media Foundation do Windows, para o que o Symphonia recusar.
- A ordem é tentativa e queda: se o primeiro falha com "formato não suportado", tenta o segundo; se os dois falham, erro com código estável para a interface pedir conversão ao usuário.
- WebM com Opus não tem solução confirmada (verificação V4). Não prometa suporte.
- Reamostragem para 16 kHz mono acontece no adaptador; o domínio recebe sempre o mesmo formato.

## Motor de fala
- Crate oficial `sherpa-onnx` (a arquitetura registrou 2.0.1 em nov/2026). Confira a versão atual e a API em https://docs.rs/sherpa-onnx/latest/sherpa_onnx/ com o subagente `docs-researcher` antes de escrever. A API é crua e muda.
- Um motor para três funções: transcrição, VAD e falantes. Não acrescente um segundo runtime ONNX ao binário sem ADR: o risco de conflito é hipótese não testada (V8).
- Modelo de partida: Parakeet TDT 0.6B v3 em INT8. A configuração que funciona sai do spike T-0005; não a invente.
- `transcribe-rs` é adaptador alternativo, não par. `whisper-rs` está fora no Windows.

## Modelos (`ModelStore`)
- Manifesto versionado: nome, função, URL, tamanho, SHA-256, licença.
- Download com retomada; arquivo parcial nunca é usado; hash conferido antes de liberar.
- Origem: os repositórios de quem publica o modelo. O projeto não hospeda (custo zero).
- Tamanhos da arquitetura são aproximados: o manifesto real é a fonte.
- Progresso real em bytes, cancelável.

## Qualidade e desempenho
- Meta a validar, não medição: uma hora de reunião em menos de dez minutos numa CPU de quatro núcleos.
- O modelo padrão só é fixado depois de benchmark com cinco gravações reais em pt-BR. Até lá, não escreva "o melhor modelo" em lugar nenhum.
- Erro de falante com fala sobreposta é esperado: a interface permite trocar o falante de um trecho, e as métricas são recalculadas.

## Testes
- **Contrato:** cada adaptador de `MediaDecoder`, `SpeechToText` e `Diarizer` passa pela suíte genérica da porta (fluxo, cancelamento, erro).
- **Rápidos (todo commit):** junção texto-falante, corte por VAD com sinal sintético, tratamento de erro de formato, manifesto e checksum com servidor falso.
- **Lentos (`#[ignore]`):** áudios curtos de referência com texto esperado e taxa máxima de erro por palavra; rodam com modelos em cache, fora do CI por commit (`node scripts/verify.mjs --slow`).
- **Dados:** só áudio encenado ou sintético. Nenhuma reunião real no repositório.

## Antes de entregar
- Temporário some no caminho feliz, no erro e no cancelamento (há teste para os três).
- Nenhum caminho absoluto da sua máquina no código ou nos testes.
- Medições no relatório vêm com a máquina em que foram feitas.
