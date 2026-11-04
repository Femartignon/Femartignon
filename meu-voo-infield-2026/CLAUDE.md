# Meu Voo — Encontro Infield 2026 (Takeda) · app SpotMe

Contexto permanente do projeto. Leia antes de qualquer alteração nesta pasta. Guia de uso e contrato de dados: `LEIA-ME.md`.

## Objetivo

Página autocontida "Meu Voo" personalizada por participante, aberta a partir do app SpotMe (16–19/11/2026, Grand Hyatt Rio, SSO). Os dados vêm das merge tags `{{activatedPerson.*}}` no **fragmento (`#`) do link**: nada vai ao servidor, a CSP não tem `connect-src`, os dados ficam em `sessionStorage` até a aba fechar. Sem formulário, sem login extra.

## Estado atual

- Versão **v0.4.2** (04/11/2026), em produção em `https://meu-voo-v040.vercel.app/`.
- Vercel: time `felipe-0ef6`, projeto `meu-voo-v0.4.0` (`prj_KmR7MVC2VCPkdrW8iNzJAMAgM91q`), Git neste repo, branch `main`.
  - Root Directory `meu-voo-infield-2026`, Output Directory `publicar` (override), sem build command.
  - Deployment Protection: Vercel Authentication, Standard Protection (previews protegidos; domínio de produção público).
  - "Improve models with this project's data": desligado.
- Botão no SpotMe: colado e renderizando (print de 04/11). Pendente: teste com dados reais (16 e 19/11) no app (iOS, Android e web).

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
