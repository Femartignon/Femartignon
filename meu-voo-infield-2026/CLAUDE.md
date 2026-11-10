# Meu Voo — Encontro Infield 2026 (Takeda) · app SpotMe

Contexto permanente do projeto. Leia antes de qualquer alteração nesta pasta. Guia de uso e contrato de dados: `LEIA-ME.md`.

## Objetivo

Página autocontida "Meu Voo" personalizada por participante, aberta a partir do app SpotMe (16–19/11/2026, Grand Hyatt Rio, SSO). Os dados vêm das merge tags `{{activatedPerson.*}}` no **fragmento (`#`) do link**: nada vai ao servidor, a CSP não tem `connect-src`, os dados ficam em `sessionStorage` até a aba fechar. Sem formulário, sem login extra.

## Estado atual

- Versão **v0.5.0** (07/11/2026), em produção em `https://meu-voo-v040.vercel.app/` (inclui a correção de data da v0.4.2, que não tinha ido para a `main`). Seções: Voos (abas Ida/Volta, um cartão por vez) · Antes de voar · Chegada. Jornada e Ajuda retiradas na v0.5.0.
- Vercel: time `felipe-0ef6`, projeto `meu-voo-v0.4.0` (`prj_KmR7MVC2VCPkdrW8iNzJAMAgM91q`), Git neste repo, branch `main`.
  - Root Directory `meu-voo-infield-2026`, Output Directory `publicar` (override), sem build command.
  - Deployment Protection: Vercel Authentication, Standard Protection (previews protegidos; domínio de produção público).
  - "Improve models with this project's data": desligado.
- Botão no SpotMe: colado e renderizando (print de 04/11). Pendente: teste com dados reais (16 e 19/11) no app (iOS, Android e web).

## Versão B (v0.6.0, 10/11/2026) · é a página publicada

- `publicar/index.html` sai de **`python3 fonte/build_b.py`** (fontes em `fonte/b/`: `pagina.html`, `pagina.css`, `app.js`, `dados.js`, `icones.json`, `fontes.css`). `fonte/build.py` segue gerando só `dist/` (botão, link, prévia da v0.5.0) e não escreve mais em `publicar/`.
- Layout: bilhete em grafite como capa, ida e volta em carrossel, barra fixa (Bilhete · Antes de voar · Chegada/Transfer · Ao vivo), checklist no fio (fica verde ao completar os 4), e na volta o bloco "Transfer de retorno" com o horário de `transfer_volta` (chave `tv` do link).
- `fonte/b/dados.js` é a leitura do link e o modelo da viagem da v0.5.0, sem alteração de regra. Link e botão do SpotMe não mudaram.
- Só tema claro. `&qa=1` no fim do link abre o diagnóstico campo a campo. "Apagar dados deste aparelho" fica no rodapé.
- QA: `node fonte/qa/validar_b.js <pasta>` (personas de `voo.json`, 360/390/1280 px, estados no tempo, CSP, rede, fluxos).
- Voltar para a v0.5.0: `git revert` do commit da v0.6.0 (ou `python3 fonte/build.py` e copiar `dist/meu-voo.html` para `publicar/index.html`).

## Arquitetura

- `fonte/base/`: folha de estilo, tema, sprite, dados e módulo das páginas v0.3.1 em produção (identidade Fio Condutor), **extraídos sem alteração**. Os hashes batem com a CSP publicada. Não editar.
- `fonte/src/`: acréscimos do Meu Voo (`voo.json` é a fonte única de configuração, campos, aeroportos, textos e personas de QA; `meu-voo.js`, `meu-voo.css`, `meu-voo.body.html`, `sprite-extra.svg`).
- `fonte/build.py`: injeta o Meu Voo no módulo compartilhado com âncoras e `assert`. Se a base mudar, o build para em vez de gerar página quebrada. Gera `publicar/index.html` (publicado) e `dist/` (botão, link, prévia).
- `fonte/qa/validar.py`: Playwright, 14 estados da viagem, CSP, console, overflow, desktop, fluxo botão nativo → página, axe opcional.

## Regras do SpotMe (validadas no cartão de embarque)

- Pode: `{{#if}}` / `{{else}}` (aninhados), merge tag em `href`/`src`/`bgcolor`, `table`/`td`/`font`/`b`/`a`, `bgcolor` só em `<td>`.
- **Não pode**: `{{#unless}}`, `{{#with}}`, helpers como `(eq)` → erro de parse que derruba a página inteira. Sem `div`/`style`/JS/SVG no HTML colado.
- Chaves duplas dentro de comentário HTML também são interpretadas: nunca escrever merge tag em comentário.
- Campos reais do Backstage: `voo_<trecho>_*`, `horario_<trecho>`, `horario_<trecho>_chegada`, `Data_ida`, `Data_volta_` (com underscore final).

## Cuidados

- Mudou o domínio: alterar `baseUrl` em `fonte/src/voo.json`, rodar o build e recolar o botão no SpotMe (o link antigo fica no app).
- O nome do domínio carrega a versão (`v040`): é URL de longa duração no app; não renomear o projeto sem atualizar o botão.
- Janelas de check-in: LATAM 48 h (F43 confirmado), GOL 48 h (F44) e Azul 72 h (F45) a validar.
