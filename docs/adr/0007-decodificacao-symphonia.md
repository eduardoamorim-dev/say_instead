---
status: accepted
date: 2026-11-18
---

# ADR-0007: Decodificação com Symphonia e Media Foundation de reserva

## Contexto
O app recebe arquivos de vídeo e áudio variados e precisa extrair áudio mono em 16 kHz. Gravações de Meet e Zoom costumam ser MP4 com AAC.

## Decisão
Symphonia é o decodificador padrão. O que ele recusar vai para o Media Foundation do Windows, isolado no adaptador de `speech`. ffmpeg fica fora do projeto.

## Alternativas consideradas
- **ffmpeg.** Abre praticamente qualquer arquivo; binário grande e licença LGPL ou GPL.
- **Só Media Foundation.** Já vem no sistema; API trabalhosa e código só de Windows no caminho principal.

## Consequências
- Caminho principal em Rust puro, sem binário extra.
- Código específico do Windows só no adaptador de reserva.
- WebM com Opus ainda não tem solução confirmada (verificação V4): se nenhum dos dois abrir, o app pede que o usuário converta o arquivo.
- O arquivo original é lido onde está; só o áudio temporário é gravado, e apagado no fim.

## Gatilho de revisão
Fatia relevante de usuários com arquivos que nenhum dos dois decodificadores abre.
