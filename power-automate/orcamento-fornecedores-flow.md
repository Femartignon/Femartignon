# Flow: Orçamento de Fornecedores → Draft de PO

Cloud Flow que dispara quando chega um e-mail de um dos fornecedores de eventos
(Opus Viagens, Hub Casa da Vila, Incentivare) com um orçamento em Excel anexo,
extrai os valores do orçamento (separando Fee da agência x custos repassados a
terceiros/Nota de Débito), e cria um **draft** de e-mail para abertura de PO.

> Não requer nenhuma credencial nova além das conexões padrão do Office 365 /
> Excel Online já existentes na sua conta corporativa — você monta isso pelo
> portal normal (make.powerautomate.com), sem precisar de `az login` nem de
> nada instalado nesta sessão.

## Pré-requisitos

- O anexo Excel precisa ser salvo em algum lugar (OneDrive ou SharePoint) para
  a ação "Run script" conseguir abri-lo — o flow salva automaticamente antes
  de processar.
- Escolha uma biblioteca/pasta para receber os anexos processados (ex.:
  `OneDrive/Orcamentos Fornecedores/`).

## Passo a passo

### 1. Trigger — `Office 365 Outlook: When a new email arrives (V3)`

Configuração no portal:
- **Folder**: Inbox (ou a subpasta que você usar)
- **Only with Attachments**: Sim
- **Include Attachments**: Sim

> O conector só filtra por **um** remetente em "From". Como são 3 domínios,
> deixe "From" vazio e filtre com uma Condition logo depois (passo 2).

### 2. Condition — `É fornecedor + tem anexo de orçamento?`

Expressão (modo avançado / "Edit in advanced mode"):

```
@and(
  or(
    contains(toLower(triggerOutputs()?['body/from']), 'opusviagens.com.br'),
    contains(toLower(triggerOutputs()?['body/from']), 'hubcasadavila.com'),
    contains(toLower(triggerOutputs()?['body/from']), 'incentivare.com.br')
  ),
  greater(length(triggerOutputs()?['body/attachments']), 0)
)
```

Tudo dentro do ramo **"If yes"** a partir daqui.

### 3. `Apply to each` sobre `triggerOutputs()?['body/attachments']`

Dentro do loop:

#### 3.1 Condition — é excel e parece orçamento?

```
@and(
  or(
    endsWith(toLower(items('Apply_to_each')?['name']), '.xlsx'),
    endsWith(toLower(items('Apply_to_each')?['name']), '.xls')
  ),
  or(
    contains(toLower(items('Apply_to_each')?['name']), 'orcamento'),
    contains(toLower(items('Apply_to_each')?['name']), 'orçamento')
  )
)
```

Ajuste a segunda condição se os fornecedores não nomearem o arquivo de forma
consistente — nesse caso remova essa parte e trate como orçamento qualquer
`.xlsx`/`.xls` anexado por esses remetentes.

#### 3.2 (If yes) `OneDrive for Business: Create file`

- **Folder Path**: `/Orcamentos Fornecedores`
- **File Name**: `items('Apply_to_each')?['name']`
- **File Content**: `items('Apply_to_each')?['contentBytes']`

#### 3.3 `Excel Online (Business): Run script`

- **Location / Document Library / File**: aponte para o arquivo criado no
  passo 3.2 (`outputs('Create_file')?['body/Id']` no picker dinâmico)
- **Script**: cole o conteúdo de
  [`scripts/extract-orcamento.ts`](./scripts/extract-orcamento.ts)

Isso devolve um objeto:
```json
{
  "itens": [{ "rotulo": "Valor de Aéreo", "valor": 12345.67, "categoria": "custo" }, ...],
  "totalFee": 3500.00,
  "totalCusto": 48210.55,
  "totalGeral": 51710.55,
  "avisos": []
}
```

### 4. (fora do Apply to each) `Compose` — Resumo dos itens (opcional, para auditoria)

Expressão para montar uma lista legível (HTML) dos itens extraídos, útil para
colar no corpo do draft como detalhamento:

```
@join(
  select(body('Run_script')?['itens'], item => concat(item['rotulo'], ': R$ ', formatNumber(item['valor'], 'N2'))),
  '<br>'
)
```

### 5. `Compose` — Mapeamento de fornecedor (Aprovador / Centro de Custo / Conta Contábil)

Esses dados **não existem na planilha** — vêm de regra de negócio interna.
Sugestão: um `Switch` sobre o domínio do remetente, com um `Compose` por
`Case` retornando um objeto fixo, por exemplo:

```json
{
  "fornecedor": "Opus Viagens",
  "centroCusto": "PREENCHER",
  "contaContabil": "PREENCHER",
  "aprovadorPadrao": "PREENCHER"
}
```

Repita para `hubcasadavila.com` e `incentivare.com.br`. Se você tiver essa
tabela em SharePoint/Excel, troque o `Switch` por um `List rows` filtrado
pelo domínio — mais fácil de manter do que editar o flow toda vez.

### 6. `Office 365 Outlook: Create draft`

> Se essa ação não aparecer no seu conector (algumas licenças/versões não
> têm "Create draft" nativo), use "Send an email (V2)" e depois mova
> manualmente para Rascunhos, ou peça ajuda que eu monto a alternativa via
> HTTP + Graph API.

- **To**: quem vai abrir a PO (pode ser fixo ou dinâmico)
- **Subject**: `Abertura de PO - @{body('Compose_-_Mapeamento')?['fornecedor']}`
- **Body** (HTML):

```html
Fe, seguem informações para abertura de PO:<br><br>
Fornecedor: @{body('Compose_-_Mapeamento')?['fornecedor']}<br>
Valor de NF: R$ @{formatNumber(body('Run_script')?['totalCusto'], 'N2')}<br>
Valor de Fatura: R$ @{formatNumber(body('Run_script')?['totalFee'], 'N2')}<br>
Em nome de: PREENCHER<br>
Aprovador: @{body('Compose_-_Mapeamento')?['aprovadorPadrao']}<br>
Centro de Custos: @{body('Compose_-_Mapeamento')?['centroCusto']}<br>
Conta contábil: @{body('Compose_-_Mapeamento')?['contaContabil']}<br>
<br>
Detalhamento do orçamento:<br>
@{outputs('Compose_-_Resumo_dos_itens')}
```

## Pontos em aberto para você confirmar

1. **Valor de Fatura = Fee** e **Valor de NF = remanescente** — confirma essa
   correspondência, ou é o contrário na sua contabilidade?
2. **Em nome de** — normalmente é quem solicitou o evento; não tem como
   derivar isso do e-mail do fornecedor. Vem de algum outro lugar (assunto do
   e-mail original do solicitante, um formulário prévio)?
3. **Aprovador / Centro de Custos / Conta contábil** — confirma se dá para
   fixar por fornecedor (regra simples) ou se varia por projeto/evento (nesse
   caso precisa de uma tabela de consulta, não um valor fixo por domínio).
4. **Detecção de "é orçamento"** — nome do arquivo é confiável ou os
   fornecedores mandam nomes aleatórios? Se for aleatório, dá pra trocar para
   "qualquer excel anexado por esses remetentes = orçamento".

Assim que confirmar esses pontos eu ajusto o roteiro e o script.
