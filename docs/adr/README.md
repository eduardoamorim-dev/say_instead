# Decisões de arquitetura (ADR)

Uma decisão por arquivo, curta: contexto, decisão, alternativas, consequências. O formato vem de Michael Nygard, "Documenting Architecture Decisions".

## Regras
- **ADR aceito não se reescreve.** Para mudar uma decisão, crie um ADR novo que a substitua; no antigo, só o status muda para `superseded by NNNN`.
- **Quem aceita é o humano.** Agente cria ADR com `status: proposed` e para. O humano troca para `accepted`.
- **Código que contraria ADR aceito não aterrissa.** Se a tarefa pede isso, pare e proponha o ADR antes.
- Número sequencial de quatro dígitos; nome do arquivo em minúsculas com hífens.
- Use a skill `write-adr`.

## O que pede ADR
Trocar ou acrescentar tecnologia de base; mudar a regra de dependência ou criar crate; mudar formato de dado persistido ou de pacote; abrir exceção a um princípio; qualquer coisa que gere custo. Escolha local e reversível (nome de função, estrutura interna de um módulo) não pede ADR: vai no relatório da tarefa.

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-plataforma-so-windows.md) | Só Windows 10 e 11, 64 bits | aceito |
| [0002](0002-custo-zero.md) | O projeto não paga por nada | aceito |
| [0003](0003-casca-tauri-2.md) | Casca em Tauri 2 | aceito |
| [0004](0004-seis-crates-portas-e-adaptadores.md) | Seis crates com portas e adaptadores | aceito |
| [0005](0005-interface-react-tailwind-shadcn.md) | Interface em React, TypeScript, Tailwind e shadcn/ui | aceito |
| [0006](0006-motor-de-fala-sherpa-onnx.md) | Motor de fala sherpa-onnx com Parakeet v3 | aceito |
| [0007](0007-decodificacao-symphonia.md) | Decodificação com Symphonia e Media Foundation de reserva | aceito |
| [0008](0008-banco-sqlite-rusqlite.md) | SQLite via rusqlite | aceito |
| [0009](0009-ia-por-assinatura-via-acp.md) | IA por assinatura via ACP | aceito |
| [0010](0010-ia-por-chave-via-genai.md) | IA por chave de API via crate genai | aceito |
| [0011](0011-transcricao-inteira-no-contexto.md) | Transcrição inteira no contexto da análise | aceito |
| [0012](0012-base-curada-agent-skills.md) | Base curada em Agent Skills com releases assinadas | aceito |
| [0013](0013-segredos-no-cofre-do-windows.md) | Segredos no Gerenciador de Credenciais do Windows | aceito |
| [0014](0014-atualizacao-updater-tauri.md) | Atualização pelo updater do Tauri com GitHub Releases | aceito |
| [0015](0015-distribuicao-gratuita-em-tres-fases.md) | Distribuição gratuita em três fases | aceito |

As quinze decisões vêm do documento de arquitetura de 18/11/2026. As comparações completas estão nele; aqui fica o essencial.
