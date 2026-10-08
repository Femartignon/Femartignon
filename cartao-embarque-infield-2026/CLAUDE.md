# Cartão de embarque — Encontro Infield 2026 (Takeda) · app SpotMe

Contexto permanente do projeto. Leia antes de qualquer alteração nesta pasta.

## Objetivo

Página "Meu Voo" no app do evento (SpotMe): um cartão de embarque por trecho, colado no
editor HTML da plataforma, preenchido por merge tags do participante (`{{activatedPerson.*}}`).
IDA e VOLTA ficam em **abas separadas** do app → **um arquivo por trecho**.

## Estado atual

- Design em produção: **"Meu Voo — versão A"**. Bilhete creme com:
  - fita de marca e logos Infield à esquerda e Takeda à direita;
  - passageiro;
  - rota com picote vermelho e avião;
  - grade 2×2: Data, Horário, Voo, Localizador (em vermelho);
  - linha de conexão condicional;
  - código de barras ilustrativo;
  - bloco "Antes de embarcar".
- Largura **fluida (`width="100%"`)**, igual à V6 validada. Largura fixa (390 px) fez o
  cartão transbordar para a direita no app. Não voltar a fixar.
- Entregáveis: `cartao-embarque-ida.html` e `cartao-embarque-volta.html`.
- Pendente: o usuário ainda não confirmou no app a versão A depois da correção de largura.

## Arquivos

| Arquivo | Papel |
|---|---|
| `build.py` | **Fonte única de verdade.** Gera os dois HTML. Nunca editar os HTML à mão. |
| `cartao-embarque-ida.html` / `cartao-embarque-volta.html` | Saída gerada, colada no app (uma aba cada). |
| `preview.py` | Simula o render do app (ver "Validação"). |
| `header-fita-780x192.png`, `logo-infield.png`, `logo-takeda-pilula.png` | Imagens de marca, publicadas pelo Netlify. |
| `logos/LA.png`, `AD.png`, `G3.png` | Logos brancos das cias, da V6. Não usados na versão A, mas mantidos. |

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
| `Data_ida` / `Data_volta_` | Data. **`Data_volta_` tem sublinhado final.** |
| `voo_<trecho>_cia`, `voo_<trecho>_cor` | Usados só na V6 (logo e cor por cia). A versão A não usa. |

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
   line-height e resolve `if`/`else`.
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

## Preferências do usuário

- Responder em português, direto e didático. Entregar o código pronto para colar (arquivo e/ou texto).
- Alterar só o necessário; preservar componentes, nomes e decisões aprovadas.
- **Não agendar check-ins automáticos** em PRs (o usuário pediu). Os avisos do GitHub chegam sozinhos.
