# Power Automate — Fluxos NEC Eventos
**Equipe:** Neurociências & Acesso (NEC) — Takeda  
**Arquivo:** NEC_Eventos_Reestruturado_v4.xlsx  
**Data:** Junho 2025

---

## Status de Acesso

### Bloqueio Identificado

| Item | Detalhe |
|---|---|
| **Recurso** | Microsoft Graph API (`graph.microsoft.com`) |
| **O que foi tentado** | `curl -I https://graph.microsoft.com/v1.0/me` |
| **Erro retornado** | HTTP 403 — `Host not in allowlist: graph.microsoft.com. Add this host to your network egress settings to allow access.` |
| **Permissão necessária** | Liberação de egresso de rede para `graph.microsoft.com` no ambiente de execução |
| **Impacto** | Impossível criar ou testar fluxos Power Automate via API neste ambiente |
| **Alternativa imediata** | Blueprint completo abaixo — importe/crie manualmente no portal power.automate.com |

> **Ação requerida:** Solicitar ao time de TI/Cloud a liberação do domínio `graph.microsoft.com` no egress policy do ambiente M365. Enquanto isso, os fluxos devem ser criados manualmente seguindo os blueprints abaixo.

---

## Arquitetura Geral dos Fluxos

```
SharePoint/OneDrive
    └── NEC_Eventos_Reestruturado_v4.xlsx
            ├── TblEventos
            ├── TblAtividades
            └── TblFinanceiro
                     │
                     ▼
            Power Automate (4 fluxos)
                     │
                     ▼
            Teams / Outlook (notificações)
```

**Pré-requisito:** O arquivo deve estar em SharePoint ou OneDrive (não em disco local) para que o Power Automate consiga lê-lo. Consulte `sharepoint_arquitetura.md` para o plano de migração.

---

## Fluxo 1: Alerta de Pagamentos Pendentes

**Nome:** `NEC-F1-PagamentosPendentes`  
**Gatilho:** Recorrência — toda segunda-feira às 08:00  
**Destino:** E-mail para responsáveis financeiros + Canal Teams NEC  

### Passos no Power Automate

```
1. GATILHO
   ├── Tipo: Recorrência
   ├── Frequência: Semana
   ├── Dias: Segunda-feira
   └── Hora: 08:00 (Horário de Brasília — UTC-3)

2. AÇÃO: Obter linhas de tabela (Excel Online Business)
   ├── Arquivo: NEC_Eventos_Reestruturado_v4.xlsx (SharePoint)
   └── Tabela: TblFinanceiro

3. AÇÃO: Filtrar matriz
   └── Condição: item()?['Status Pag.'] eq 'Pendente' 
               OR item()?['Status Pag.'] eq 'A preencher'

4. CONDIÇÃO: length(body('Filtrar_matriz')) greater than 0
   ├── SE SIM:
   │   ├── AÇÃO: Criar tabela HTML (montar lista de pendências)
   │   │   Colunas: Evento, Fornecedor, Orç. Previsto, Status Pag.
   │   │
   │   ├── AÇÃO: Enviar e-mail (Office 365 Outlook)
   │   │   Para: [responsável financeiro NEC]
   │   │   Assunto: ⚠️ NEC — @{length(body('Filtrar_matriz'))} pagamento(s) pendente(s)
   │   │   Corpo: [tabela HTML gerada acima]
   │   │
   │   └── AÇÃO: Publicar mensagem no Teams
   │       Canal: NEC Operações
   │       Mensagem: @{length(body('Filtrar_matriz'))} pagamento(s) pendente(s) — verifique o arquivo NEC.
   │
   └── SE NÃO: (não faz nada)
```

### Expressão para filtrar
```
@equals(items('Aplicar_a_cada')?['Status Pag.'], 'Pendente')
```

---

## Fluxo 2: Alerta de Atividades Atrasadas

**Nome:** `NEC-F2-AtividadesAtrasadas`  
**Gatilho:** Recorrência — diário às 07:00  
**Destino:** E-mail para responsável da atividade  

### Passos no Power Automate

```
1. GATILHO
   ├── Tipo: Recorrência
   ├── Frequência: Dia
   └── Hora: 07:00

2. AÇÃO: Obter linhas de tabela (Excel Online Business)
   ├── Arquivo: NEC_Eventos_Reestruturado_v4.xlsx (SharePoint)
   └── Tabela: TblAtividades

3. VARIÁVEL: DataHoje = formatDateTime(utcNow(), 'yyyy-MM-dd')

4. AÇÃO: Filtrar matriz
   └── Condição:
       (item()?['Status'] eq 'ATRASADO')
       OR
       (item()?['Status'] eq 'PENDENTE' 
        AND item()?['Prazo'] ne null
        AND item()?['Prazo'] lt variables('DataHoje'))

5. CONDIÇÃO: Existem atividades atrasadas?
   ├── SE SIM: Aplicar a cada [atividade atrasada]
   │   └── AÇÃO: Enviar e-mail (Office 365 Outlook)
   │       Para: item()?['Responsável'] + @seudominio.com
   │       Assunto: 🔴 NEC — Atividade atrasada: @{item()?['Atividade']}
   │       Corpo: 
   │         Evento: @{item()?['Evento']}
   │         Etapa: @{item()?['Etapa']}
   │         Atividade: @{item()?['Atividade']}
   │         Prazo: @{item()?['Prazo']}
   │         Status atual: @{item()?['Status']}
   │         Acesse o arquivo NEC para atualizar o status.
   │
   └── SE NÃO: (não faz nada)
```

> **Nota sobre e-mail do responsável:** O campo "Responsável" contém nome da pessoa (ex: "João Silva"). Você precisará de uma tabela de mapeamento Nome → E-mail no fluxo, ou trocar o campo para conter o e-mail diretamente em DB_ATIVIDADES.

---

## Fluxo 3: Resumo Semanal para Responsáveis

**Nome:** `NEC-F3-ResumoSemanal`  
**Gatilho:** Recorrência — sexta-feira às 17:00  
**Destino:** E-mail para toda a equipe NEC + gestor  

### Passos no Power Automate

```
1. GATILHO
   ├── Tipo: Recorrência
   ├── Frequência: Semana
   ├── Dias: Sexta-feira
   └── Hora: 17:00

2. AÇÃO: Obter linhas (TblEventos) — filtrar a Realizar
3. AÇÃO: Obter linhas (TblAtividades) — filtrar PENDENTE/ATRASADO
4. AÇÃO: Obter linhas (TblFinanceiro) — filtrar Pendente

5. AÇÃO: Compor mensagem HTML de resumo
   Seções:
   ├── Eventos Próximos 7 dias (filtrar Data Início <= addDays(utcNow(), 7))
   ├── Atividades Pendentes (contagem)
   ├── Atividades Atrasadas (contagem)
   └── Pagamentos Pendentes (contagem + valor total)

6. AÇÃO: Enviar e-mail
   Para: [lista de distribuição equipe NEC]
   Assunto: 📊 NEC — Resumo Semanal @{formatDateTime(utcNow(), 'dd/MM/yyyy')}
   Corpo: [HTML gerado no passo 5]
   Importância: Normal

7. AÇÃO: Executar Office Script (opcional)
   └── Script: office_script_nec.ts (gera aba RELATORIO_SEMANAL no Excel)
       Referência: Automatizar → Executar script no Excel Online
```

### Template do corpo do e-mail (HTML)
```html
<h2 style="color:#1F4E79">Resumo Semanal NEC — @{formatDateTime(utcNow(), 'dd/MM/yyyy')}</h2>
<table border="1" cellpadding="5" style="border-collapse:collapse">
  <tr style="background:#2E75B6;color:white">
    <th>Métrica</th><th>Quantidade</th>
  </tr>
  <tr><td>Eventos próximos 7 dias</td><td>@{length(...)}</td></tr>
  <tr><td>Atividades pendentes</td><td>@{length(...)}</td></tr>
  <tr><td>Atividades atrasadas</td><td>@{length(...)}</td></tr>
  <tr><td>Pagamentos pendentes</td><td>@{length(...)}</td></tr>
</table>
<p style="color:gray;font-size:11px">Gerado automaticamente por Power Automate NEC</p>
```

---

## Fluxo 4: Alerta de Eventos Próximos

**Nome:** `NEC-F4-EventosProximos`  
**Gatilho:** Recorrência — toda segunda-feira às 07:30  
**Destino:** Canal Teams NEC + e-mail para solicitantes  

### Passos no Power Automate

```
1. GATILHO
   ├── Tipo: Recorrência
   ├── Frequência: Semana
   ├── Dias: Segunda-feira
   └── Hora: 07:30

2. VARIÁVEL: DataInicio7d = addDays(utcNow(), 7)
   VARIÁVEL: DataInicio30d = addDays(utcNow(), 30)
   VARIÁVEL: DataHoje = utcNow()

3. AÇÃO: Obter linhas (TblEventos)

4. AÇÃO: Filtrar — próximos 7 dias
   item()?['Status Evento'] eq 'a Realizar'
   AND item()?['Data Início'] ge variables('DataHoje')
   AND item()?['Data Início'] le variables('DataInicio7d')

5. AÇÃO: Filtrar — próximos 30 dias
   item()?['Status Evento'] eq 'a Realizar'
   AND item()?['Data Início'] gt variables('DataInicio7d')
   AND item()?['Data Início'] le variables('DataInicio30d')

6. CONDIÇÃO: Existem eventos nos próximos 7 dias?
   ├── SE SIM:
   │   └── AÇÃO: Publicar no Teams
   │       Canal: NEC Operações
   │       Mensagem: 🚨 ATENÇÃO: @{length(...)} evento(s) em 7 dias!
   │                 [lista dos eventos com cidade e data]
   └── SE NÃO: (não faz nada)

7. AÇÃO: Publicar resumo 30 dias no Teams
   Mensagem: 📅 Próximos 30 dias: @{length(...)} evento(s) programado(s)
```

---

## Configuração de Conexões no Power Automate

Para todos os fluxos, você precisará configurar:

| Conector | Uso | Licença necessária |
|---|---|---|
| Excel Online (Business) | Ler tabelas TblEventos, TblAtividades, TblFinanceiro | Microsoft 365 Business |
| Office 365 Outlook | Enviar e-mails automáticos | Microsoft 365 Business |
| Microsoft Teams | Publicar mensagens em canal | Microsoft Teams |
| Office Scripts | Executar script no Excel | Microsoft 365 Business (plano E3+) |

### Passo a passo para criar conexões
1. Acesse `make.powerautomate.com`
2. Clique em **Dados → Conexões → Nova conexão**
3. Pesquise cada conector acima e autorize com a conta corporativa Takeda

---

## Variáveis de Ambiente Recomendadas

Configure como variáveis de ambiente do Power Automate para facilitar manutenção:

```
NEC_ARQUIVO_SHAREPOINT   = URL do arquivo no SharePoint
NEC_SITE_SHAREPOINT      = URL do site SharePoint NEC
NEC_EMAIL_RESPONSAVEIS   = lista de distribuição email
NEC_TEAMS_CANAL_ID       = ID do canal Teams NEC Operações
NEC_TIMEZONE             = America/Sao_Paulo
```

---

## Próximos Passos

1. Migrar arquivo para SharePoint (ver `sharepoint_arquitetura.md`)
2. Solicitar liberação de `graph.microsoft.com` no egress policy
3. Criar conexões no Power Automate com conta corporativa
4. Importar os 4 fluxos usando os blueprints acima
5. Testar cada fluxo manualmente antes de ativar recorrência
6. Configurar alertas de falha de fluxo para o admin NEC
