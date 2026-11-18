# Estrutura no Maestri

Como montar o canvas do Maestri para este projeto. A parte A é sua (só a interface do Maestri faz). A parte B é do agente Maestro, pela CLI. A parte C são conferências da primeira vez.

O que este arquivo afirma sobre o Maestri vem da documentação lida em 18/11/2026 (https://www.themaestri.app/pt-br/docs/intro). Onde a documentação não dizia, está marcado como "a conferir".

## O desenho

```
Workspace: <projeto>            ambiente: Local (Windows nativo)
│
├─ TÉRREO  (pasta do projeto, branch main)
│   ├─ terminal "Maestro"     Claude Code · modo Maestro ligado · Responsabilidade Maestro
│   ├─ terminal "Revisor"     Claude Code · Responsabilidade Revisor
│   ├─ notas (arquivos do repositório, usados no lugar):
│   │     docs/roadmap.md · docs/open-questions.md · docs/board/log.md · docs/architecture.md (bloqueada)
│   └─ banda "Fábrica": Maestro, Revisor e os implementadores ativos
│
├─ ANDAR "T-0001-…"  (worktree, branch task/T-0001-…)
│   └─ terminal "Impl T-0001"   Claude Code · Responsabilidade Implementador
│
└─ ANDAR "T-0002-…"  (no máximo dois andares de tarefa ao mesmo tempo)
    └─ terminal "Impl T-0002"
```

Por que assim:
- **Térreo só coordena.** Em `main` os guardas bloqueiam código de produto. O Maestro planeja e move o quadro; o Revisor lê e julga.
- **Um andar por tarefa.** Cada andar é um checkout isolado: dois agentes nunca editam o mesmo arquivo ao mesmo tempo, e o build de um não atrapalha o do outro.
- **Dois andares no máximo, para começar.** Build de Rust é pesado e cada entrega precisa da sua atenção para aterrissar. O limite fica em `scripts/config/harness.json` (`wipLimit`).
- **O quadro mora no repositório**, em `docs/board/`. Não monte um kanban paralelo em Fichários: seriam duas fontes da verdade.
- **Três Responsabilidades bastam.** O conhecimento de cada área está nas skills, que o Implementador carrega conforme a tarefa.

## Windows nativo, não WSL
Isto muda o seu hábito de abrir projetos no WSL, e é de propósito: o app só compila e roda no Windows (Tauri com WebView2, Gerenciador de Credenciais, Media Foundation). No WSL o `cargo` compilaria para Linux, e nada do que os agentes verificassem valeria para o produto.

- Pasta do projeto num disco do Windows, com caminho curto: `C:\dev\<nome>`.
- Ambiente do workspace: **Local**.
- Claude Code instalado no Windows, com Git for Windows.

Consequência provável: o Claude Code do Windows é uma instalação separada da do WSL, então deve ser preciso fazer login nele também.

---

## Parte A — você, na interface do Maestri

1. **Workspace.** Crie um workspace apontando para a pasta do projeto, com ambiente Local. (O plano gratuito tem um workspace; se o seu já está ocupado, é preciso liberar ou importar este no lugar.)
2. **Primeiro terminal.** Abra um terminal com o Claude Code. Em Detalhes, marque **Maestro**.
3. **Dê a partida.** Escreva: `Leia BOOTSTRAP.md e execute.` Responda ao que ele perguntar.
4. **Hooks de andar.** No menu de andares, "Configurar hooks…", preencha:

   | Hook | Comando |
   |---|---|
   | Setup | `node scripts/floor-setup.mjs` |
   | Run | `node scripts/floor-run.mjs` |
   | Teardown | `node scripts/floor-teardown.mjs` |

   Os três são Node puro: funcionam em PowerShell, CMD ou Git Bash.
5. **Sincronização de instruções.** Na tela de edição do workspace, o Maestri gerencia `CLAUDE.md` e `AGENTS.md`. Deixe a sincronização desligada enquanto todos os terminais forem Claude Code. Se for usar Codex ou Gemini em algum terminal, ligue, sabendo que os guardas (hooks) só valem para o Claude Code.
6. **Notas.** Arraste para o canvas, a partir da pasta do projeto: `docs/roadmap.md`, `docs/open-questions.md`, `docs/board/log.md` e `docs/architecture.md`. Arquivo `.md` arrastado é usado no lugar, sem cópia. Em `docs/architecture.md`, use "Bloquear conteúdo".
7. **Partitura.** Quando o térreo estiver montado (Maestro, Revisor, notas, banda), selecione tudo e salve como Partitura, por exemplo "Fábrica <projeto>". Fica como modelo para remontar.

## Parte B — o Maestro, pela CLI

Maestro: faça isto depois do passo 6 do `BOOTSTRAP.md`. A fonte da sintaxe é `maestri --help` e a skill `/maestri-manager`. Os comandos abaixo são os que constavam na documentação em 18/11/2026; confirme cada um antes de usar e não invente opção.

1. **Reconhecer o terreno.**
   ```
   maestri --help
   maestri list
   ```
   Se `maestri` não existir, você não está num terminal do Maestri: diga isso ao humano e pule a parte B.
2. **Criar as Responsabilidades** "Maestro", "Implementador" e "Revisor", cada uma com o texto do arquivo correspondente em `maestri/roles/`. Use a skill `/maestri-manager` para criar. Se não houver comando para isso, peça ao humano: Ajustes → Agentes → nova Responsabilidade, colando o conteúdo do arquivo.
3. **Assumir a Responsabilidade "Maestro"** neste terminal, se a ferramenta permitir; senão, peça ao humano.
4. **Recrutar o Revisor** no térreo, com a Responsabilidade "Revisor":
   ```
   maestri recruit "Revisor"
   ```
5. **Criar a banda:**
   ```
   maestri band create "Fábrica" "Revisor"
   ```
   Se bandas não estiverem disponíveis no plano, peça ao humano que ligue um cabo entre o Maestro e cada terminal.
6. **Conectar as notas** ao Maestro, se o humano já as colocou no canvas.
7. **Relatar ao humano** o que foi criado, o que ficou para ele (parte A) e o resultado das conferências da parte C.

### A cada tarefa
```
node scripts/task.mjs move <id> in_progress        # imprime o comando do andar
maestri floor create "<id>-<slug>" --branch task/<id>-<slug>
```
Depois, recrute o Implementador **dentro do andar**, com a Responsabilidade "Implementador", e acrescente-o à banda (`maestri recruit … --band "Fábrica"`; veja em `maestri recruit --help` como indicar o andar). Se não houver como recrutar para um andar pela CLI, peça ao humano que abra um terminal do Claude Code naquele andar e atribua a Responsabilidade.

Primeira mensagem ao Implementador: `Use a skill start-task para a <id>.`

Quando a tarefa aterrissar, peça ao humano que remova o andar (o Teardown confere se não há trabalho solto) e tire o Implementador da banda.

### Aterrissagem
É sempre do humano. Dois caminhos equivalentes:
- ele digita `/land-task <id>` no terminal do Maestro; ou
- ele usa a aterrissagem do próprio Maestri no andar (merge local ou pull request) e avisa. Aí rode `node scripts/task.mjs move <id> landed`; o script confere que a branch está em `main`.

## Parte C — conferências da primeira vez

Registre o resultado de cada uma em `docs/open-questions.md` (itens H1 a H4 e H6).

| # | Conferir | Como | Se der errado |
|---|---|---|---|
| H1 | Andares e bandas existem no seu plano, na quantidade necessária | Criar dois andares e uma banda | Sem andar: `git worktree add ../<repo>-<id> -b task/<id>-<slug>` e um terminal nessa pasta. Sem banda: cabos |
| H2 | Onde o andar é criado e se o `CLAUDE.md` carrega duas vezes | No primeiro andar: `git worktree list`; no Claude do andar, `/context` | Veja abaixo |
| H3 | O hook de Setup roda no Windows | Criar um andar e ler a saída do Setup | Rode `node scripts/floor-setup.mjs` à mão no terminal do andar |
| H4 | Como um agente manda mensagem a outro | Skill instalada pela conexão ou pela banda | O humano leva o recado, ou os avisos ficam só nos arquivos do quadro |
| H6 | O Claude Code confia na pasta do andar | Ao abrir o Claude num andar novo, veja se aparece o diálogo de confiança na pasta | Aceite. Enquanto a pasta não é confiável, o Claude Code ignora as permissões do projeto (`claude doctor` avisa); confira também com `/hooks` se os guardas carregaram |

### Se o `CLAUDE.md` carregar duas vezes (H2)
O Claude Code carrega o `CLAUDE.md` da pasta em que foi aberto e de todas as pastas acima dela. Se o Maestri cria o andar **dentro** da pasta do projeto, o agente do andar lê o `CLAUDE.md` do andar e também o do térreo: o mesmo texto duas vezes.

Conserto, no térreo, em `.claude/settings.local.json` (arquivo pessoal, fora do git; o `.worktreeinclude` o copia para cada andar novo):
```json
{
  "claudeMdExcludes": ["**/.maestri/floors/*/CLAUDE.md"]
}
```
Assim vale só o `CLAUDE.md` do térreo. Depois de salvar, abra uma sessão nova no andar e confira com `/context`.

Se o andar for criado **ao lado** da pasta do projeto, nada disso é necessário.

## Uso do dia a dia
- **Você fala com o Maestro.** Ele fala com os outros. Para intervir numa tarefa, fale direto com o Implementador dela.
- **O que pede a sua atenção:** plano de marco, ADR proposto, pergunta de guarda ("pedir confirmação"), tarefa em `verified`.
- **Contexto cheio:** `/clear` em qualquer terminal é seguro. O estado está no quadro e nos commits; o gancho de início de sessão recoloca o agente no lugar.
- **Rotina opcional** (Arquivo → Rotinas): um prompt diário ao Maestro, "Rode `node scripts/task.mjs next` e me diga o que espera por mim."
- **Se um agente errar do mesmo jeito duas vezes,** não corrija só o resultado: veja "Como evoluir o harness" em `docs/harness.md`.
