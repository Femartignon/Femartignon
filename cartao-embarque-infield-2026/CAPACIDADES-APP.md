# Capacidades do app (SpotMe) — matriz validada

Fonte de verdade para tudo que é gerado nesta pasta (`build.py`, `build_widget.py`, `testes/`).
Atualize ao validar um recurso novo no app. Testes reproduzíveis em `testes/build_testes.py`.

## Template (merge tags)

| Recurso | Status | Observação |
|---|---|---|
| `{{campo}}` / `{{{campo}}}` | ✅ | três chaves = HTML sem escapar |
| Merge tag dentro de atributo (`src`, `href`, `bgcolor`) | ✅ | |
| `{{#if}}…{{/if}}`, aninhado | ✅ | |
| `{{else}}` | ✅ | |
| `{{#unless}}` | ❌ | erro de parse |
| `{{#with}}` | ❌ | erro de parse |
| Subexpressão / comparação `(eq a "x")` | ❌ | erro de parse → cor por cia exige o campo `voo_<trecho>_cor` |
| Objeto inexistente (`event.*`, `user.*`…) | ✅ vazio | não quebra a página |

Erro de parse derruba a página inteira: sintaxe nova sempre em teste isolado.
Chaves literais em texto: usar `&#123;` / `&#125;`.

## Tags nativas

- `workspace.`: `name`, `id`, `organization_name`, `start_date`, `end_date`, `timezone`, `location`,
  `country`, `country_code`, `in_app_display`, `calendar_invite`
- `activatedPerson.`: `fname`, `lname`, `email`, `position`, `BU`, `biography`, `attendance_type`,
  `fp_fstg_page`, `fp_status`, `registrationtype`, `targetedlistname`, `contact_id`, `fp_ids`,
  `external_qr_value`, `attendance_status`, `fp_rsvp_status`, `fp_locale`, `is_team_member`,
  `language`, `spotme_activation_phone`, `gamification_accepted`
- Campos do projeto (importados): `voo_<trecho>_*`, `horario_<trecho>[_chegada]`, `Data_ida`, `Data_volta_`
- Formato dos valores de `workspace.*`: pendente (teste D).

## HTML

| Recurso | Status | Observação |
|---|---|---|
| `table` / `td` / `font` / `b` / `br` / `img` | ✅ | base de todo o layout |
| `bgcolor` em `<td>` | ✅ | em `<table>` é descartado |
| `style="border-radius"` em `<td>` | ✅ | substitui os cantos de `<td>` de 1 px |
| `style` com `background`, `linear-gradient`, `box-shadow`, `line-height` | ❌ | `style` é filtrado por propriedade |
| `<div>` / `<span>` com estilo | ❌ | |
| `<details>` / `<summary>` | ❌ | recolher = abas do app |
| `<a href>`: https, Maps, `wa.me`, `tel:`, `mailto:`, merge tag no link | ✅ | |
| `<img>` externo (GitHub raw PNG/GIF, serviço de QR) | ✅ | |
| GIF animado | ✅ | |
| `<img src="data:…">` (data URI) | ✅ | imagens embutidas, sem hospedagem |
| SVG como arquivo (`.svg` externo) ou `<svg>` inline | ❌ | usar data URI ou PNG |
| line-height | fixo ~22 px | alturas explícitas por linha; texto grande em linha própria |

## Compliance

- QR por serviço externo envia o conteúdo a terceiros: não usar com localizador nem `external_qr_value`
  sem aprovação.
