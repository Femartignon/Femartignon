# Cartão de embarque — Encontro Infield 2026 (Takeda) · app SpotMe

Contexto permanente do projeto. Leia antes de qualquer alteração nesta pasta.

## Objetivo

Página "Meu Voo" no app do evento (SpotMe): um cartão de embarque por trecho, colado no
editor HTML da plataforma, preenchido por merge tags do participante (`{{activatedPerson.*}}`).
IDA e VOLTA ficam em **abas separadas** do app → **um arquivo por trecho**.

## Estado atual

- Design em produção: **"Meu Voo — versão A.2 (detalhe do voo)"**. Bilhete creme com fita de
  marca, logos Infield/Takeda, passageiro e o bloco **"Detalhe do voo"**, replicado o mais perto
  possível de um print de app de cia aérea fornecido pelo usuário (paleta própria, ver abaixo):
  - zona cinza (`ZONE_BG`) com o título "<cidade origem> a <cidade destino>" em navy
    (cai no código IATA sem a cidade cadastrada);
  - dentro dela, um cartão branco (`CARD_BG`) com: o número do voo; colunas PARTIDA/CHEGADA
    (ícone fino de decolagem/pouso, data, horário em navy + código do aeroporto, cidade) com uma
    linha vertical e um avião num círculo cinza ao centro; e OPERADO POR/DURAÇÃO (a linha some
    por inteiro sem `voo_<trecho>_operadora`).
  - Fora desse bloco, como já era: LOCALIZADOR (vermelho), conexão condicional, código de barras
    e o bloco "Antes de embarcar". O usuário pediu explicitamente para manter esses elementos
    (perguntei antes de remover; resposta: "visual do print + tudo que já existe").
- **Fonte:** o app só aceita `<font>`/`<b>` — sem CSS, não existe peso "thin" (precisaria de
  fonte customizada carregada via `@font-face`, que o app não permite). "Thin" do print = aqui,
  texto sem `<b>` na cor `MUTED2` (cinza mais claro); "bold" = com `<b>`.
- Largura **fluida (`width="100%"`)**, igual à V6 validada. Largura fixa (390 px) fez o
  cartão transbordar para a direita no app. Não voltar a fixar.
- Entregáveis: `cartao-embarque-ida.html` e `cartao-embarque-volta.html`.
- Pendente: o usuário ainda não confirmou a versão A.2 no app.
- **Cuidado ao editar `flight_detail()`:** qualquer peça colocada como item solto na lista de
  `white_card` (não dentro de um `band(..., CARD_BG, ...)`) precisa do seu próprio `bgcolor`
  explícito — um `gap()`/`<td>` sem cor aí herda o cinza da zona por trás (já aconteceu: ver
  `card_gap` e o comentário acima de `trailing`). O mesmo vale para a zona (`ZONE_BG`) dentro
  do creme (`CREAM`).

## Arquivos

| Arquivo | Papel |
|---|---|
| `build.py` | **Fonte única de verdade.** Gera os dois HTML. Nunca editar os HTML à mão. |
| `cartao-embarque-ida.html` / `cartao-embarque-volta.html` | Saída gerada, colada no app (uma aba cada). |
| `preview.py` | Simula o render do app (ver "Validação"). |
| `header-fita-780x192.png`, `logo-infield.png`, `logo-takeda-pilula.png` | Imagens de marca, publicadas pelo Netlify. |
| `logos/LA.png`, `AD.png`, `G3.png` | Logos brancos das cias, da V6. Não usados na versão A.2, mas mantidos. |

Fluxo: editar `build.py` → `python3 build.py` (requer Pillow) → validar → commit/PR → entregar
os HTML ao usuário (como arquivo e/ou texto para colar).

## Hospedagem das imagens

- Site Netlify **`cartao-embarque-infield-2026`**, com base directory = esta pasta. URL
  `https://cartao-embarque-infield-2026.netlify.app/<arquivo>` (constante `BRAND` em `build.py`).
- Produção publica **a partir da `main`**. Imagem nova só fica no ar depois do merge. Cada PR
  ganha deploy preview em `deploy-preview-<N>--cartao-embarque-infield-2026.netlify.app`.
- Avião e código de barras são PNG gerados no build e **embutidos como data URI**, sem hospedagem.

## Campos (merge tags)

`<trecho>` = `ida` | `volta`.

| Campo | Uso |
|---|---|
| `fname`, `lname` | Passageiro |
| `voo_<trecho>_origem` / `_destino` | Códigos IATA. **Sem `_origem` o cartão inteiro some.** |
| `horario_<trecho>` | Horário de partida (grade) |
| `horario_<trecho>_chegada` | "Chegada HH:MM" sob o destino (opcional) |
| `voo_<trecho>_partida` | Voo, ex. "LA 3122" — **três chaves** `{{{ }}}` |
| `voo_<trecho>_localizador` | Localizador (vermelho) |
| `voo_<trecho>_conexao_aeroporto` | Linha "Conexão" só aparece se preenchido — `{{{ }}}` |
| `voo_<trecho>_conexao_voo` | Opcional dentro da linha de conexão — `{{{ }}}` |
| `Data_ida` / `Data_volta_` | Data (texto livre, ex. "Ter. 13 out. 2026"). **`Data_volta_` tem sublinhado final.** |
| `voo_<trecho>_origem_cidade` / `_destino_cidade` | Opcional. Sem elas, o título usa o código IATA. |
| `voo_<trecho>_operadora` | Opcional, ex. "LATAM Airlines Brasil" — `{{{ }}}`. Sem ela, a linha OPERADO POR/DURAÇÃO some. |
| `voo_<trecho>_duracao` | Opcional, ex. "1h 15m". Só aparece se `_operadora` também estiver preenchido. |
| `voo_<trecho>_cia`, `voo_<trecho>_cor` | Usados só na V6 (logo e cor por cia). A versão A.2 não usa. |

Tags nativas do app (formato dos valores ainda não verificado):
- `workspace.`: `name`, `id`, `organization_name`, `start_date`, `end_date`, `timezone`,
  `location`, `country`, `country_code`, `in_app_display`, `calendar_invite`.
- `activatedPerson.`: `email`, `position`, `BU`, `biography`, `attendance_type`, `fp_fstg_page`,
  `fp_status`, `registrationtype`, `targetedlistname`, `contact_id`, `fp_ids`,
  `external_qr_value`, `attendance_status`, `fp_rsvp_status`, `fp_locale`, `is_team_member`,
  `language`, `spotme_activation_phone`, `gamification_accepted`.

## O que o app aceita (validado com testes no app)

### Template

| Recurso | Status |
|---|---|
| `{{campo}}`, `{{{campo}}}` (sem escapar), merge tag dentro de `src` / `href` / `bgcolor` | ✅ |
| `{{#if}}…{{/if}}`, aninhado, `{{else}}` | ✅ |
| `{{#unless}}`, `{{#with}}`, subexpressão `(eq a "x")` | ❌ **erro de parse derruba a página inteira** |
| Objeto inexistente (ex. `event.name`) | ✅ vira vazio |

- Chaves literais em texto devem ir como `&#123;` / `&#125;`.
- Sintaxe nova sempre se testa isolada, nunca junto do cartão.

### HTML

| Recurso | Status |
|---|---|
| `table` / `tr` / `td` / `font` / `b` / `br` / `img` | ✅ base do layout |
| `bgcolor` em `<td>` | ✅ — **em `<table>` é descartado** |
| `style="border-radius:…"` em `<td>` | ✅ (o `build.py` ainda usa cantos de `<td>` de 1 px, também válidos) |
| `style` com background, gradiente, sombra ou line-height | ❌ (`style` é filtrado por propriedade) |
| `<div>`, `<span>`, `<details>`, `<style>`, JS, SVG (arquivo ou inline) | ❌ |
| `<a href>` com https, Google Maps, `wa.me`, `tel:`, `mailto:`, merge tag no link | ✅ |
| `<img>` externo (Netlify, GitHub raw, serviço de QR), GIF animado, `data:` URI | ✅ |

- Line-height forçado (~22 px): usar alturas explícitas por linha; texto grande vai numa
  linha própria (senão invade o rótulo).
- O app centraliza `<img>` na linha. Cantos e detalhes finos se fazem com `<td>`, não com imagem.

### Compliance

- QR gerado por serviço externo envia o conteúdo a terceiros. Não usar com localizador nem com
  `external_qr_value` sem aprovação.

## Validação antes de entregar

1. `python3 build.py`
2. `python3 preview.py cartao-embarque-ida.html` e `python3 preview.py cartao-embarque-volta.html --conexao`
   → gera `preview-*.html` (ignorado pelo git), que descarta `bgcolor` de tabela, força
   line-height e resolve `if`/`else`. `--minimo` omite cidade/operadora/duração, para testar
   o fallback desses campos opcionais.
3. Screenshot a 360 px:
   ```
   /opt/pw-browsers/chromium --headless --no-sandbox --hide-scrollbars --force-device-scale-factor=2 \
     --window-size=360,1500 --screenshot=<saida.png> file://$PWD/preview-cartao-embarque-volta.html
   ```
4. Conferir:
   - cabe em 360 px sem transbordar;
   - conexão aparece só quando preenchida;
   - cada arquivo só contém tags do próprio trecho.

## Histórico e decisões

- V2 → V6 (cartão por cor de cia, layout de wallet): validada no app. Mantida no histórico da `main`.
- PR #30 (fechada sem merge): widgets T7/T9, páginas de teste A–D, matriz de capacidades.
  Material em `refs/pull/30/head`, se for preciso.
- Versão A (PR #39): paleta fixa creme `#F7F4EF` / texto `#1E2A38` / acento `#E1242A`, cor e logo
  por cia removidos. Separação em dois arquivos (pedido do usuário). Logos numa linha sob a fita,
  porque sem CSS não há sobreposição de imagens.
- PR #40: largura fluida (100%).
- Versão A.1 (PR #42, 1ª rodada): primeira tentativa do layout "Detalhe do voo", ainda com a
  paleta do resto do cartão (vermelho/creme) e um selo com fundo para o número do voo.
- Versão A.2 (PR #42, 2ª rodada): o usuário pediu o visual **exatamente** igual ao print (cores,
  peso de fonte), mantendo Passageiro/Localizador/Conexão/código de barras. Perguntei antes de
  remover esses elementos (ver "Estado atual"). Reescrita com paleta própria (zona cinza, cartão
  branco, navy só no título/horários, resto em cinza-grafite — cores tiradas por amostragem de
  pixel do print) e `corners()` ganhou o parâmetro `page` para aninhar zona-dentro-do-creme e
  cartão-branco-dentro-da-zona. Campos novos opcionais: `_origem_cidade`, `_destino_cidade`,
  `_operadora`, `_duracao`.

## Preferências do usuário

- Responder em português, direto e didático. Entregar o código pronto para colar (arquivo e/ou texto).
- Alterar só o necessário; preservar componentes, nomes e decisões aprovadas.
- **Não agendar check-ins automáticos** em PRs (o usuário pediu). Os avisos do GitHub chegam sozinhos.
