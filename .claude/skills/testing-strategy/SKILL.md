---
name: testing-strategy
description: Como testar neste projeto - níveis de teste por fronteira da arquitetura, testes de contrato de porta com adaptadores falsos, testes lentos marcados como ignore, fixtures de migração, testes de componente com comandos simulados, e as regras de dados de teste. Use ao escrever qualquer teste, ao criar uma porta ou adaptador, ao decidir em que nível testar algo ou quando a verificação falhar por teste.
---

# Estratégia de testes

Fonte: `docs/architecture.md` (seção 14). Os testes seguem as fronteiras da arquitetura: o domínio se testa sem nada externo, cada adaptador contra um contrato, o conjunto com poucos testes de ponta a ponta.

Cobertura não é meta. A meta é que toda porta tenha contrato testado e todo critério de aceite tenha evidência.

## Em que nível testar

| O que você escreveu | Nível | Como | Roda |
|---|---|---|---|
| Regra de domínio, métrica, junção texto-falante, validação de saída | Unidade | `cargo test`, sem E/S | Todo commit |
| Caso de uso de `application` | Unidade com falsos | Adaptadores falsos em memória | Todo commit |
| Implementação de uma porta | Contrato | Suíte genérica sobre o trait | Todo commit |
| Migração de banco | Fixture | Banco de cada versão antiga chega à atual | Todo commit |
| Componente ou tela | Componente | Vitest e Testing Library, comandos simulados | Todo commit |
| Transcrição real com modelo | Referência | Áudio curto, texto esperado, taxa máxima de erro; `#[ignore]` | Diário e antes de release |
| Fluxo inteiro | Ponta a ponta | WebDriver do Tauri, provedor falso | Antes de release |
| Qualidade da análise | Avaliação | Scripts em `evals/` | Quando base, rubrica ou prompt mudam; humano dispara |
| Tempo e memória | Desempenho | Benchmark fixo | Antes de release |

Regra prática: teste no nível mais baixo que consegue provar o comportamento.

## Teste de contrato de porta
É a peça central. Para cada porta:
1. Uma suíte genérica, escrita contra o trait, que recebe uma fábrica do adaptador.
2. Ela cobre no mínimo: o fluxo normal, o cancelamento no meio, o erro do lado de fora, e a entrada inválida.
3. O falso em memória passa na suíte. Cada adaptador real passa na mesma suíte.

Se um adaptador precisa de um caso especial na suíte, ou o contrato está errado ou o adaptador está: discuta antes de abrir exceção.

Dublês usados:
- **Falso em memória** para cada porta, mantido junto do trait.
- **Agente ACP falso:** binário de teste que fala o protocolo com respostas roteirizadas, inclusive pedindo permissão e tentando escrever.
- **Servidor HTTP falso** para chave de API, Ollama, download de modelo e releases da base.

## Regras
- **Teste primeiro quando der:** escreva o teste do critério, veja falhar pelo motivo certo, implemente, veja passar. Teste que nunca falhou não prova nada.
- **Teste comportamento, não implementação.** Renomear uma função privada não deveria quebrar teste.
- **Teste negativo para toda regra:** se o código barra algo, um teste prova que barra.
- **Determinismo:** sem relógio real, sem rede, sem ordem de execução, sem dormir. Tempo e identificadores são injetados.
- **Nada de rede no CI:** nenhum teste baixa modelo, chama provedor ou consulta o GitHub. O que precisa disso é teste lento ou manual.
- **Teste lento** leva `#[ignore]` com o motivo, e roda com `node scripts/verify.mjs --slow`.
- **Arquivo temporário** sempre em pasta temporária do teste; nunca na pasta real do app nem em caminho fixo da sua máquina.
- **Não conserte o teste para passar.** Teste falhou: leia o teste, entenda a intenção, corrija o código. Apagar teste, afrouxar asserção ou marcar como ignorado para a verificação ficar verde é bloqueador de revisão. Se o teste está errado, diga por que no relatório.
- **Falha intermitente** é defeito: investigue a causa; não repita até passar.

## Dados de teste
- Só gravação encenada e transcrição sintética. Nenhuma reunião real com cliente entra no controle de versão, nem em fixture, nem em exemplo de documentação.
- Áudio de fixture curto (segundos), em `evals/` ou na pasta de fixtures do crate; o `.gitignore` barra áudio e vídeo fora dessas pastas.
- Nenhum nome, telefone, e-mail ou empresa de verdade. Nenhuma chave, mesmo vencida.
- Modelo de fala não entra no repositório.

## Interface
- Testing Library: procure por papel e texto visível, como o usuário.
- A pasta `ui/src/ipc/` é simulada; o componente nunca fala com o Tauri no teste.
- Cada um dos quatro estados da tela tem teste.
- Um teste garante que toda chave de tradução existe nos dois idiomas.

## Quando a verificação falha
1. Leia a mensagem inteira (o log completo está em `.verify/logs/`).
2. Reproduza só o teste que falhou.
3. Formule uma hipótese e confirme antes de mudar código.
4. Corrija a causa. Rode o teste, depois `node scripts/verify.mjs`.
5. Duas tentativas com abordagens diferentes sem sucesso: pare e peça ajuda, dizendo o que observou.

## Antes de entregar
- Cada critério de aceite aponta para um teste ou uma evidência objetiva.
- Porta nova: trait, falso e contrato. Adaptador novo: passa no contrato.
- Nenhum teste ignorado sem motivo escrito; nenhum teste removido sem explicação no relatório.
