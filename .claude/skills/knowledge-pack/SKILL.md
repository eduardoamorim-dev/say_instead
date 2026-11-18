---
name: knowledge-pack
description: Como implementar e manter a base curada de vendas - pacote no formato Agent Skills, manifesto assinado com hash por arquivo, atualização por GitHub Releases com versão embutida e desfazer, charter do usuário, governança de conteúdo e defesa contra injeção de prompt. Use ao trabalhar em crates/knowledge, na porta KnowledgeSource, no formato do pacote, no atualizador da base, no charter ou no conteúdo da própria base.
---

# Base de conhecimento

Fonte: `docs/architecture.md` (seção 9), ADR-0012. A inteligência de vendas é um pacote de arquivos Markdown que o app baixa e troca sem versão nova do app.

## Estrutura do pacote
```
knowledge-pack/
  manifest.json          versão, versão mínima do app, hash de cada arquivo
  charter-template.md    perguntas sobre oferta, cliente ideal, preço e objeções
  rubric/rubric.md       critérios e escala
  rubric/schema.json     formato da saída estruturada
  skills/<tema>/SKILL.md abertura, descoberta, objecao-de-preco, oferta, proximo-passo…
  providers.json         situação de cada provedor de IA
  sources.md             de onde veio cada ideia
  evals/                 transcrições sintéticas com gabarito
```

## Formato Agent Skills
Especificação: https://agentskills.io/specification.md (confira a versão atual).
- Uma pasta por skill, com `SKILL.md` obrigatório.
- No cabeçalho, `name` (até 64 caracteres, minúsculas e hífens, igual ao nome da pasta) e `description` (até 1.024 caracteres, dizendo o que faz e quando usar).
- Corpo com menos de 500 linhas; detalhe em `references/`, a um nível de profundidade.
- O validador do app aplica essas regras e recusa pacote fora do formato.

## Regras que não mudam
- **A base é entrada de prompt.** Um arquivo malicioso viraria injeção para todos os usuários. Defesas, todas obrigatórias: manifesto assinado; hash por arquivo; revisão obrigatória no repositório da base; agente sem escrita nem execução; o app ignora qualquer pasta `scripts/` do pacote.
- **Nada do pacote é executado.** É texto. O app lê, valida e entrega ao contexto.
- **O charter do usuário fica na máquina dele.** O pacote traz só o modelo de perguntas. As respostas nunca vão para o repositório nem para os autores.
- **Análise antiga aponta para a versão com que foi feita.** Versões instaladas não são apagadas enquanto houver análise que dependa delas.
- **O esquema da saída vem do pacote** (`rubric/schema.json`), não do código.

## Atualização (`KnowledgeSource`)
1. Consultar as releases do repositório da base, no máximo uma vez por dia ou por botão.
2. Baixar o manifesto; comparar versão e versão mínima do app.
3. Baixar o pacote; conferir o SHA-256 de cada arquivo e a assinatura do manifesto com a chave pública embutida no app.
4. Instalar em `knowledge/<versão>/`, trocar o ponteiro da versão ativa, manter a anterior para desfazer.

- Uma versão vem embutida no app: o primeiro dia funciona sem rede.
- Falha em qualquer conferência: a versão ativa não muda, e o erro tem código estável.
- Instalação atômica: ou a pasta nova está inteira e conferida, ou não existe.
- Esquema de assinatura (algoritmo, formato, onde fica a chave privada) é decisão a registrar em ADR na primeira tarefa do marco 6. A chave privada nunca entra no repositório.
- Dois adaptadores atrás da porta: pasta local (desenvolvimento e versão embutida) e GitHub Releases.

## Versões
- A base tem versão própria (SemVer) e declara a versão mínima do app que a entende.
- Mudar critério ou escala da rubrica sobe a versão maior, porque quebra a comparação com análises antigas.
- `knowledge_pack` no banco guarda uma linha por versão baixada: versão, hash, origem.

## Governança do conteúdo
- Toda afirmação da base aponta a origem em `sources.md`. O texto é resumo próprio com referência; nunca trecho copiado de livro, curso ou outro repositório.
- Todo pull request na base passa por validação de formato e pelas avaliações de `evals/`.
- Licença do conteúdo é a decisão D2; base no mesmo repositório ou em outro é a D3. Não escolha pelo humano.
- A metodologia de venda que entra primeiro é a decisão D4. Começa por uma venda só, a do mantenedor.

## `providers.json`
A situação de cada provedor de IA (o que é permitido, por qual caminho) envelhece rápido. Mora aqui para ser atualizada sem lançar o app. O adaptador de IA lê; nada disso vira código.

## Testes
- Validador de formato: pacotes de fixture válidos e inválidos (nome errado, descrição longa, corpo grande, pasta `scripts/` presente).
- Atualizador contra servidor falso: versão nova, versão mínima do app maior que a atual, hash errado, assinatura errada, download interrompido, desfazer.
- Nada baixa da internet nos testes.

## Antes de entregar
- Teste prova que pacote com hash ou assinatura errada não é instalado e que a versão ativa não muda.
- Teste prova que `scripts/` do pacote é ignorada.
- Nenhum conteúdo copiado de fonte protegida; `sources.md` atualizado se a tarefa mexeu em conteúdo.
