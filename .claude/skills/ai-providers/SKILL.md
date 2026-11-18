---
name: ai-providers
description: Como implementar a camada de IA no crate providers - a porta AnalysisProvider e suas três famílias de adaptador (agente via ACP, chave de API com genai, modelo local com Ollama), isolamento de sessão, negação de permissões, detecção de saúde e testes de contrato. Use ao trabalhar em crates/providers, no fluxo de conversa ou análise com um modelo, na detecção de CLIs de agente ou em qualquer coisa que envolva assinatura, chave de API ou regras de provedor.
---

# Camada de IA

Fonte: `docs/architecture.md` (seção 8), ADR-0009 e ADR-0010. O app nunca fala com um modelo diretamente: fala com a porta `AnalysisProvider`.

## A porta
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
É o contrato de partida da arquitetura. A forma exata (trait assíncrono, tipos de erro) segue o que a skill `rust-core` definiu para portas. Mudar o contrato pede ADR.

## Regras que não mudam
- **Provedor é detalhe.** Nome de provedor só existe dentro de `crates/providers` e em dados (`ProviderDescriptor`, `providers.json`). `domain` e `application` não sabem quem responde.
- **Quem paga é o usuário**, com a assinatura, a chave ou a máquina dele. O projeto não tem chave própria, nem no código, nem no CI, nem nos testes.
- **O agente não escreve nem executa.** Sem capacidade de escrita de arquivo, sem terminal, todo pedido de permissão negado.
- **O app não toca em credencial de CLI.** Não lê, não copia, não procura arquivo de login.
- **A chave de API nunca passa pela interface** depois de salva, e nunca aparece em log ou erro.
- **O que sai da máquina é texto:** instruções, base, charter, transcrição, perguntas. Antes do primeiro envio a um provedor em nuvem, a interface mostra o que vai e para quem.

## Família 1: agente via ACP
- Crate oficial `agent-client-protocol` (a arquitetura registrou 5.3.0, protocolo v1). Confira versão e API com o subagente `docs-researcher`: https://docs.rs/agent-client-protocol e a especificação em https://github.com/agentclientprotocol/agent-client-protocol.
- Fluxo: `initialize` → `session/new` → `session/prompt` → série de `session/update` → resposta final com o motivo da parada. Cancelamento pelo método do protocolo.
- **Pasta de sessão:** cada conversa ganha uma pasta própria em `cache/`, com `transcricao.md`, `instrucoes.md` e os arquivos da base. É o diretório de trabalho do agente. Nada fora dela é exposto. Apagar a reunião apaga a pasta.
- **Capacidades:** o cliente não declara escrita de arquivo nem terminal, e responde "negar" a todo `session/request_permission`. A forma exata de declarar ausência é a verificação V2: confira na especificação antes de implementar, e cubra com teste.
- **Subprocesso:** comando e argumentos fixos por adaptador; nada montado a partir de texto do usuário. Encerrar o app encerra o subprocesso.
- **Node:** os adaptadores ACP do Claude e do Codex vêm por npm. `health()` verifica Node e diz ao usuário o que falta, em vez de falhar no meio.
- **WSL:** CLI instalado só dentro do WSL é a verificação V3. Sem o spike, não implemente.

## Família 2: chave de API
- Crate `genai` (https://github.com/jeremychone/rust-genai). Confira a API atual.
- Chave lida do `SecretStore` no momento do uso.
- Saída estruturada pode exigir tratamento por provedor: isole isso dentro do adaptador.
- Mostre ao usuário uma estimativa de custo quando o provedor permitir calcular; não invente preço.

## Família 3: modelo local
- HTTP para o Ollama na própria máquina (`localhost`). Nada sai.
- `health()` confere se o serviço responde e se há modelo instalado.
- Qualidade menor em análise longa é esperada: o `descriptor` declara as capacidades, e a interface avisa.

## Saúde e primeira configuração
`health()` responde, sem efeito colateral: o CLI existe? qual versão? há Node? o agente responde a um turno mínimo? A resposta é um estado tipado que a interface traduz em instrução ("instale X", "faça login no CLI").

## Situação dos provedores
Muda rápido. Mora em `providers.json`, na base curada, atualizável sem lançar o app. Não escreva regra de provedor em código nem em teste. Se uma tarefa depende de "o provedor X permite Y", confira hoje na fonte oficial e registre a data.

## Texto não confiável
- A transcrição e a base entram no contexto delimitadas como dado. Fala de cliente pode conter instrução; com agente só de leitura, o dano máximo é uma resposta ruim.
- A resposta do modelo é texto não confiável até ser validada (skill `analysis-engine`) e sanitizada na interface.

## Testes
- **Contrato único** para as três famílias: fluxo em pedaços, cancelamento no meio, erro de provedor, sessão inválida. O marco 7 termina quando o mesmo teste passa nas três.
- **Agente ACP falso:** um binário de teste que fala o protocolo e devolve respostas roteirizadas, inclusive pedindo permissão (que precisa ser negada) e tentando escrever.
- **Servidor HTTP falso** para chave de API e Ollama.
- **Nenhum teste chama provedor real** no CI. Teste com provedor real é manual, na máquina de quem mantém, e nunca faz parte de `verify`.

## Antes de entregar
- `grep` por nome de provedor fora de `crates/providers`: nada.
- Teste prova que permissão é negada e que nada é escrito fora da pasta de sessão.
- Nenhuma chave, token ou caminho de credencial em código, teste, log ou relatório.
