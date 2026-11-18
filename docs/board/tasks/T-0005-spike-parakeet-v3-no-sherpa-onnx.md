---
id: T-0005
title: "Spike: Parakeet v3 no sherpa-onnx"
milestone: 1
area: speech
type: spike
status: backlog
depends_on: []
branch: task/T-0005-spike-parakeet-v3-no-sherpa-onnx
---

## Objetivo
Responder, com um programa mínimo rodando no Windows, se o Parakeet TDT 0.6B v3 (INT8) transcreve português pelo crate oficial `sherpa-onnx`, e com qual configuração. É a verificação V1 de `docs/open-questions.md` e a maior incerteza do marco 1.

## Contexto
- `docs/architecture.md`, seção 6 (Mídia e transcrição)
- ADR-0006 (motor de fala)
- Skills: `spike`, `speech-pipeline`
- Documentação do crate: https://docs.rs/sherpa-onnx/latest/sherpa_onnx/ (confira a versão atual; a arquitetura registrou 2.0.1)

## Escopo
- Programa de linha de comando em `spikes/T-0005/` (fora do workspace do produto) que recebe um WAV mono de 16 kHz e imprime texto com tempo
- Detecção de fala com Silero VAD antes da transcrição, pelo mesmo crate
- Medição em um áudio de pelo menos dez minutos: tempo de processamento por minuto de áudio e pico de memória, com a CPU da máquina anotada
- Um áudio encenado em português, gravado por você ou sintético; nenhuma reunião real

## Fora de escopo
- Decodificação de MP4 (o áudio já entra em WAV)
- Separação de falantes
- Qualquer código em `crates/`
- Comparação com Whisper (fica para o benchmark de modelos)

## Critérios de aceite
- [ ] O programa compila e roda no Windows x64 com a toolchain MSVC, sem instalar nada além do que o `cargo` baixa
- [ ] A transcrição do áudio de teste sai em português, com tempo de início e fim por trecho
- [ ] O relatório traz: versão exata do crate, nomes e origem dos arquivos de modelo, tamanho em disco, SHA-256 de cada arquivo, e a configuração usada
- [ ] O relatório traz os números medidos e diz o que foi observado e o que é inferência
- [ ] O relatório responde: sim, não, ou sim com ressalvas; e o que muda na arquitetura, se algo mudar
- [ ] Se a resposta for "não", o relatório descreve o que falhou e propõe o próximo teste (transcribe-rs ou Whisper turbo)

## Verificação
Comando para reproduzir o resultado, com a saída colada no relatório. `node scripts/verify.mjs --full` verde.

## Notas
Os modelos não entram no git: baixe para uma pasta ignorada e registre URL e hash. Se a licença de algum modelo impedir redistribuição, anote: isso afeta o plano de espelhar modelos.
