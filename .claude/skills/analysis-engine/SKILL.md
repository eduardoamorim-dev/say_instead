---
name: analysis-engine
description: Como implementar o motor de análise - montagem do contexto em ordem fixa, métricas calculadas em Rust antes da IA, saída estruturada validada contra esquema e contra a transcrição, regra de evidência por achado, conversa com citação de tempo e as três camadas de avaliação. Use ao trabalhar na geração do relatório de análise, no chat sobre a reunião, nas métricas da conversa, na validação de respostas de modelo ou na pasta evals/.
---

# Motor de análise

Fonte: `docs/architecture.md` (seção 10), ADR-0011. Dois modos sobre o mesmo contexto: um relatório estruturado, gerado uma vez por reunião, e a conversa livre.

## Onde mora cada parte
- **Regras puras em `domain`:** métricas, montagem do contexto, validação da saída, regra de evidência. Tudo testável sem modelo.
- **Orquestração em `application`:** o caso de uso que monta o contexto, chama a porta `AnalysisProvider`, valida, refaz uma vez e grava.
- **Nada de provedor aqui.** O motor não sabe quem responde.

## Montagem do contexto
Ordem fixa, do mais estável ao mais variável (aproveita cache de prompt onde existe):
1. Instruções do papel e rubrica.
2. Skills da base curada.
3. Charter do usuário.
4. Métricas calculadas e transcrição, com falante e tempo.
5. A tarefa ou a pergunta.

- A transcrição entra inteira. Não há busca vetorial.
- Reunião acima de três horas passa por resumo em blocos antes da análise.
- Transcrição e base entram delimitadas como dado, com instrução de que conteúdo dentro delas não é ordem.
- Cada trecho carrega o `segment_id`, o falante e o tempo, para que a resposta possa citá-los.

## Métricas calculadas antes da IA
Em Rust, sem modelo, reproduzíveis:
- proporção de fala de cada lado;
- número de perguntas do vendedor;
- maior monólogo;
- minuto em que o preço aparece.

Entram no contexto como fatos. O modelo não conta. Trocar o falante de um trecho recalcula. A definição de cada métrica (o que conta como pergunta, como detectar preço) é escrita e testada com exemplos; ambiguidade vai para o relatório da tarefa, não vira palpite.

## Saída estruturada
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
O esquema vem do pacote da base (`rubric/schema.json`). O código valida contra o esquema da versão ativa; não fixe campos no Rust além do necessário para a interface.

## As três verificações, em toda resposta
1. O JSON é válido e segue o esquema.
2. Cada `segment_id` existe na reunião.
3. Cada citação aparece de fato no trecho apontado. A tolerância da comparação (espaço, pontuação, caixa) a arquitetura não fixou: defina na tarefa, escreva a regra e teste.

Achado que falha é refeito uma vez. Se falhar de novo, é gravado e exibido como "sem evidência". Nunca se descarta em silêncio e nunca se apresenta como válido.

## Como obter o JSON em cada família
- Chave de API: saída estruturada do provedor, quando existir.
- Agente via ACP e modelo local: pedir um bloco JSON na resposta, extrair e validar; nova tentativa se vier fora do formato.
- O extrator tolera texto antes e depois do bloco, e é testado com respostas malformadas.

## Persistência
- `analysis` é imutável e registra modelo, versão da base e versão da rubrica.
- `finding` guarda critério, veredito, evidências e sugestão, para comparar reuniões ao longo do tempo.
- A mesma reunião analisada duas vezes pode dar resultado diferente: por isso cada análise é uma linha nova.

## Conversa
- Recebe o mesmo contexto e o relatório já gerado.
- A instrução manda responder só com base na transcrição e citar o tempo de cada afirmação.
- A interface transforma cada tempo em link para o trecho; tempo que não existe não vira link.
- `message` registra provedor e modelo de cada resposta.

## Avaliação
| Camada | Verifica | Quando | Onde |
|---|---|---|---|
| Determinística | Esquema, evidências, idioma da resposta | Todo commit | CI, sem chamar modelo |
| Conjunto de referência | 20 a 30 transcrições sintéticas com defeito plantado; mede se o defeito é encontrado | Quando base, rubrica ou prompt mudam | Máquina de quem mantém, com a própria assinatura ou modelo local |
| Revisão humana | Amostra de análises reais, com consentimento | Periodicamente | Fora do repositório |

- O CI só roda a primeira camada (custo zero). Script de avaliação que chama modelo nunca entra em `verify`.
- Rodar a segunda camada consome a assinatura de quem roda: é ato humano, não de agente.
- Transcrição de avaliação é sintética. Nenhuma reunião real no repositório.

## Testes
- Métricas: casos pequenos, escritos à mão, com o resultado esperado calculado na mão.
- Validação: respostas boas, com JSON quebrado, com `segment_id` inventado, com citação que não está no trecho.
- Caso de uso com provedor falso roteirizado: resposta boa de primeira; ruim e depois boa; ruim duas vezes.

## Antes de entregar
- Nenhum achado sem evidência é exibido como válido (há teste).
- Nenhum nome de provedor no motor.
- Prompt ou rubrica mudou? Diga no relatório que a segunda camada de avaliação precisa ser rodada por um humano.
