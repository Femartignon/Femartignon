# Meu Voo · Encontro Infield 2026 · v0.5.0

Página autocontida (`meu-voo.html`) no layout das páginas v0.3.1 (identidade Fio Condutor). Personalizada pelas merge tags do SpotMe: sem formulário, sem login extra e sem dado pessoal na hospedagem.

## Como a personalização funciona

1. Os dados de voo ficam nos campos do participante no Backstage, os mesmos do cartão de embarque nativo (`voo_<trecho>_*`, `horario_<trecho>`, `Data_ida`, `Data_volta_`).
2. O link da página leva as merge tags no fragmento (`#`). Quando a pessoa toca, o SpotMe troca cada tag pelo valor dela (acesso por SSO).
3. A página lê o fragmento no aparelho, limpa o endereço e monta o conteúdo. O fragmento não vai na requisição, a CSP da página não permite conexões e nada é gravado em servidor. Os dados ficam na aba (sessionStorage) até ela fechar.

## Ligar no SpotMe

| Forma | Arquivo | Situação |
|---|---|---|
| A · Botão na página nativa Meu Voo (recomendada) | `meu-voo-spotme-botao.html`: colar no editor HTML da página, ou ao fim dos cartões Ida/Volta | Usa só markup validado no app: tabela, `font`, `b`, link com merge tag, `if`/`else`. Sem `unless` |
| B · Item de menu com link | `link-spotme.txt` (1.375 caracteres) | Testar antes: em 02/11 o Embed abriu o navegador sem personalizar, e o campo de link pode limitar o tamanho |

Teste com um participante real: abra pelo botão com `&qa=1` no fim do link e veja o diagnóstico campo a campo no painel de QA.

## Publicar

Projeto Vercel `meu-voo-v0.4.0` (time `felipe-0ef6`) → `https://meu-voo-v040.vercel.app/`, ligado a este repositório (branch `main`). Configuração: Root Directory `meu-voo-infield-2026`, Output Directory `publicar`, sem build no Vercel. Na hospedagem vai só `publicar/index.html`: fonte, `dist/` e LEIA-ME ficam fora. O build grava `publicar/index.html` junto com `dist/meu-voo.html`; commit em `main` publica. Mudou o domínio: alterar `baseUrl` em `fonte/src/voo.json` e rodar o build (o link e o botão são regenerados). O botão "Trânsito ao vivo" aponta para a Logística em `myencontroinfield.vercel.app` (`logisticaUrl` no mesmo arquivo).

## Contrato de dados (link → Backstage)

| Chave | Campo | Chave | Campo |
|---|---|---|---|
| `n` | `fname` | `sn` | `lname` |
| `ida.o` / `volta.o` | `voo_<trecho>_origem` (IATA) | `ida.d` / `volta.d` | `voo_<trecho>_destino` (IATA) |
| `ida.oc` / `volta.oc` | `voo_<trecho>_origem_cidade` | `ida.dc` / `volta.dc` | `voo_<trecho>_destino_cidade` |
| `ida.dt` / `volta.dt` | `Data_ida` / `Data_volta_` | `ida.h` / `volta.h` | `horario_<trecho>` |
| `ida.c` / `volta.c` | `horario_<trecho>_chegada` | `ida.v` / `volta.v` | `voo_<trecho>_partida` |
| `ida.l` / `volta.l` | `voo_<trecho>_localizador` | `ida.x` / `volta.x` | `voo_<trecho>_conexao_aeroporto` |
| `ida.xv` / `volta.xv` | `voo_<trecho>_conexao_voo` | `ida.op` / `volta.op` | `voo_<trecho>_operadora` |
| `ida.du` / `volta.du` | `voo_<trecho>_duracao` | `pac` · `tv` | `pacote_logistico` · `transfer_volta` (opcionais) |

- Sem origem e destino, o trecho não aparece (mesma regra do cartão nativo). Campo vazio some, sem placeholder (D06).
- Formatos aceitos: data `Seg. 16 nov. 2026`, `16/11/2026` ou `2026-11-16`; hora `06:40` ou `6h40`; voo `LA 3910`; conexão em IATA. Entidades como `LA&nbsp;3910` são recompostas.
- Fuso de cada aeroporto de origem (Manaus, Cuiabá e Campo Grande UTC−4; Rio Branco UTC−5; Noronha UTC−2): contagem e jornada certas para quem sai de outro fuso.

## O que a página faz

- Capa com o que fazer agora: contagem até o voo, check-in liberado, hora de ir ao aeroporto, em voo (progresso), chegada ao Rio, evento, dia da volta e epílogo.
- Seções: Voos · Antes de voar · Chegada.
- Cartão do trecho com abas: os títulos "Voo de ida" e "Voo de volta" ficam lado a lado e trocam o único cartão exibido (clique ou setas do teclado). Abre na ida; depois que a ida termina, abre na volta. "Ver cartão", na capa, seleciona o trecho certo.
- Cartão de cada trecho: o fio do KV vira a rota, com o avião na posição real do voo; conexão, `+1`, horário local, localizador oculto com revelar e copiar.
- Check-in na cia (LATAM e GOL 48 h, Azul 72 h), acompanhar no Flightradar24, salvar na agenda com lembrete 2 h antes, modo balcão com tela acesa.
- Checklist salvo no aparelho; chegada com receptivo, rota até o hotel e trânsito ao vivo.

## Regenerar e testar

- `python3 fonte/build.py` (sem dependências) → `dist/`. A base v0.3.1 fica em `fonte/base/` sem alteração; o Meu Voo entra por `fonte/src/` e por ajustes pontuais com assert no módulo compartilhado.
- `python3 fonte/qa/validar.py <saída> [axe.min.js]` (Playwright): 14 estados da viagem, contraste e acessibilidade (axe), console, CSP, estouro horizontal, largura de computador e o fluxo botão nativo → página.
- `previa/meu-voo-previa.html`: demonstração com dados fictícios e painel de QA aberto. Não publicar na hospedagem nem no app.
- v0.5.0 (07/11/2026): um cartão por vez com abas Ida/Volta no título; seções Jornada e Ajuda retiradas (com elas, o botão “Apagar dados deste aparelho”); “Antes de voar” antes de “Chegada”. Link sem mudança; no botão nativo mudou só a linha de descrição.
- v0.4.2 (04/11/2026): data inexistente (ex.: `31 set`, `30/02`) é descartada em vez de virar o dia seguinte; o trecho aparece sem data e o painel de QA aponta o campo. Botão e link sem mudança.
- v0.4.1 (04/11/2026): link e botão apontam para `meu-voo-v040.vercel.app` (antes, `myencontroinfield.vercel.app/meu-voo.html`, que não existe); "Trânsito ao vivo" com endereço absoluto.

## Pendências

- P05: campos de voo importados para todos os participantes. P09: `transfer_volta` por participante.
- P02 e P03: Help Desk e contatos da agência (ocultos até preencher, D06).
- F44 (GOL 48 h) e F45 (Azul 72 h): confirmar nos sites das companhias. F26: tempo de trajeto.
- Teste no app: iOS, Android e web, pelo botão (forma A) e pelo menu (forma B).
