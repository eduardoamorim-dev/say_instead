---
status: accepted
date: 2026-11-18
---

# ADR-0001: O app tem como alvo só o Windows 10 e 11, 64 bits

## Contexto
A primeira proposta mirava Windows e macOS. Dois alvos dobram teste, empacotamento e assinatura, e o macOS exige conta de desenvolvedor paga para distribuir sem aviso. O projeto não pode ter custo (ADR-0002).

## Decisão
Windows 10 e 11, x64, é o único alvo. macOS, Linux e Windows ARM64 ficam de fora.

## Alternativas consideradas
- **Windows e macOS.** Alcance maior; custo de conta Apple e o dobro de superfície de teste.

## Consequências
- Um motor de interface só (WebView2, Chromium): não há teste em segundo navegador.
- O CI compila e testa em Windows; o teste de ponta a ponta roda inteiro lá.
- Código específico do Windows é permitido, mas só dentro de adaptador ou da casca, para que a porta a outros sistemas continue aberta.
- Suportar Windows 10 além do 11 é decisão pendente do humano (D5 em `docs/open-questions.md`).

## Gatilho de revisão
Demanda real de usuários de macOS depois da primeira release, com alguém disposto a manter esse alvo sem custo para o projeto.
