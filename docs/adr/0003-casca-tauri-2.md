---
status: accepted
date: 2026-11-18
---

# ADR-0003: A casca do app é Tauri 2

## Contexto
O app precisa de interface web (React, que o mantenedor domina) e de trabalho nativo pesado: decodificar áudio, transcrever, separar falantes. O usuário ainda baixa cerca de 700 MB de modelo, então o tamanho do instalador conta.

## Decisão
Tauri 2, com núcleo em Rust e interface no WebView2 do sistema.

## Alternativas consideradas
- **Electron.** Ecossistema TypeScript e SDKs dos provedores nativos; pacote e memória bem maiores; transcrição por addon nativo ou processo separado.
- **WinUI 3 com .NET.** Nativo do Windows; exigiria aprender XAML e C# e fecharia a porta a outros sistemas.

## Consequências
- O trabalho pesado é chamada de função no mesmo processo.
- É preciso aprender Rust; o primeiro build é lento.
- Os SDKs dos provedores nascem em TypeScript: no Rust a integração usa o crate do ACP e HTTP.
- Comandos próprios ficam visíveis a todas as janelas por padrão: o app tem uma janela só e valida a entrada de cada comando.
- Só `src-tauri` depende de `tauri` (ADR-0004), o que mantém a casca trocável.

## Gatilho de revisão
Se o Rust travar o avanço por mais de quatro semanas seguidas, a casca muda para Electron. A interface React é reaproveitada e o núcleo Rust pode ser exposto como addon Node.
