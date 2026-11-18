---
status: accepted
date: 2026-11-18
---

# ADR-0006: Motor de fala sherpa-onnx com Parakeet v3

## Contexto
A transcrição é local e precisa de três funções: transcrever, detectar fala e separar falantes. No Windows, cada dependência nativa a mais é um risco de build e de conflito de runtime.

## Decisão
O crate oficial `sherpa-onnx` (2.0.1 em novembro de 2026) cobre as três funções. O modelo de partida é o Parakeet TDT 0.6B v3 em INT8; o Whisper large-v3-turbo fica como alternativa selecionável. Os modelos são baixados por manifesto com SHA-256, nunca embutidos.

## Alternativas consideradas
- **transcribe-rs.** API única para vários modelos e aceleração por DirectML; não tem VAD nem falantes, e exigiria o sherpa-onnx ao lado. Fica como adaptador alternativo.
- **whisper.cpp via whisper-rs.** Modelo mais conhecido; o app Whispering tirou esse motor do Windows por conflito de runtime do MSVC.
- **Processo Python (faster-whisper e pyannote).** Qualquer modelo; instalação de vários GB e token do Hugging Face.

## Consequências
- Uma dependência nativa para as três funções.
- API mais crua, isolada atrás das portas `SpeechToText` e `Diarizer`.
- Falta confirmar na prática a configuração do Parakeet v3 (verificação V1, spike T-0005).
- O modelo padrão só é fixado depois de benchmark com gravações reais em pt-BR.

## Gatilho de revisão
O spike V1 falhar, ou o benchmark mostrar erro alto demais em reunião real em português.
