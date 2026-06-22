# SharePoint — Arquitetura e Governança NEC Eventos
**Equipe:** Neurociências & Acesso (NEC) — Takeda  
**Data:** Junho 2025

---

## Status de Acesso

### Verificação de Egresso Realizada

| Item | Resultado |
|---|---|
| `graph.microsoft.com` | ❌ Bloqueado — HTTP 403 (não está no allowlist de egresso) |
| Acesso ao portal SharePoint | Não testável sem Graph API ou UI do browser |
| Power Automate API | ❌ Bloqueado pelo mesmo motivo |

**Ação requerida:** Solicitar ao time de infraestrutura/segurança que adicione `graph.microsoft.com` ao allowlist de egresso de rede do ambiente de execução. Referência: configuração de Network Egress Settings no portal de administração M365.

---

## Arquitetura Proposta

### Estrutura de Site SharePoint

```
Takeda Intranet
└── Site: NEC — Neurociências & Acesso
    ├── 📁 Biblioteca: Eventos NEC
    │   ├── 📄 NEC_Eventos_Reestruturado_v4.xlsx  ← arquivo principal
    │   ├── 📁 Histórico/
    │   │   ├── NEC_Eventos_v1.xlsx
    │   │   ├── NEC_Eventos_v2.xlsx
    │   │   └── NEC_Eventos_v3.xlsx
    │   └── 📁 Relatórios Semanais/
    │       └── (gerados automaticamente pelo Office Script)
    │
    ├── 📁 Biblioteca: Fornecedores NEC
    │   └── (contratos, NFs, propostas por fornecedor)
    │
    ├── 📁 Biblioteca: Regulatório
    │   └── (compliance, aprovações HCP)
    │
    └── 📋 Lista SharePoint: Acompanhamento de Eventos (futuro)
```

### Permissões por Perfil

| Perfil | Acesso |
|---|---|
| Gestor NEC | Proprietário — leitura, edição, exclusão |
| Time Operacional | Membro — leitura e edição |
| Agência/Fornecedor Externo | Convidado — somente leitura (pasta específica) |
| Compliance/Auditoria | Leitura — acesso somente para leitura |
| TI | Administrador de site |

---

## Plano de Migração do Excel para SharePoint

### Fase 1: Preparação (Semana 1)

- [ ] Criar site SharePoint NEC (solicitar ao admin de TI)
- [ ] Configurar biblioteca "Eventos NEC" com controle de versão habilitado
- [ ] Definir coluna de metadados na biblioteca:
  - Ano
  - Status (Ativo / Arquivo)
  - Versão
  - Responsável

### Fase 2: Upload e Conexão (Semana 2)

- [ ] Upload do `NEC_Eventos_Reestruturado_v4.xlsx` para a biblioteca
- [ ] Verificar que tabelas nomeadas (TblEventos, TblAtividades, TblFinanceiro) estão íntegras após upload
- [ ] Testar abertura co-autoria simultânea (máx. recomendado: 5 usuários simultâneos)

### Fase 3: Reconectar Power Query (Semana 2)

No Excel Online, após mover o arquivo para SharePoint:
1. **Dados → Consultas e Conexões**
2. Para cada query (PQ_EventosAtivos, PQ_AtividadesPendentes, etc.):
   - Clique com botão direito → Editar
   - Substitua `Excel.CurrentWorkbook()` pela referência SharePoint:

```M
// Antes (arquivo local)
Source = Excel.CurrentWorkbook(){[Name="TblEventos"]}[Content]

// Depois (SharePoint)
Source = 
    let
        SP = SharePoint.Files("https://[TENANT].sharepoint.com/sites/NEC-Eventos", [ApiVersion = 15]),
        Arquivo = SP{[Name="NEC_Eventos_Reestruturado_v4.xlsx"]}[Content],
        Excel = Excel.Workbook(Arquivo, null, true),
        Tabela = Excel{[Item="TblEventos", Kind="Table"]}[Data]
    in
        Tabela
```

### Fase 4: Ativar Automações (Semana 3)

- [ ] Criar conexão "Excel Online (Business)" no Power Automate apontando para o arquivo no SharePoint
- [ ] Ativar os 4 fluxos Power Automate (ver `pa_flows_nec.md`)
- [ ] Testar fluxos manualmente antes de habilitar recorrência
- [ ] Configurar alertas de falha de fluxo

---

## Configurações de Governança

### Controle de Versão da Biblioteca

```
Configuração recomendada para a biblioteca "Eventos NEC":
- Histórico de versões: SIM
- Manter versões principais: 50 (limite)
- Manter versões de rascunho: 5
- Exigir check-out antes de editar: NÃO (permite co-autoria)
- Exigir aprovação de conteúdo: NÃO (equipe pequena, desnecessário)
```

**Como configurar:**  
Biblioteca → Configurações → Configurações de controle de versão

### Política de Retenção

| Categoria | Retenção |
|---|---|
| Arquivo principal (v_atual) | Permanente enquanto ativo |
| Versões anteriores | 24 meses |
| Relatórios semanais gerados | 6 meses |
| Contratos de fornecedores | 5 anos (requisito fiscal) |

### Alertas Nativos do SharePoint

Como alternativa temporária ao Power Automate (enquanto o acesso está bloqueado), configure alertas nativos do SharePoint:

1. Abra a biblioteca "Eventos NEC"
2. Selecione o arquivo → **...** → **Alertar-me**
3. Configure:
   - **Quando alertar:** Qualquer alteração
   - **Frequência:** Imediatamente (para co-autoria) ou Diário (para resumo)
   - **Enviar para:** Lista de distribuição NEC

> Este alerta é simples (só notifica sobre mudanças no arquivo, não filtra por dados internos). Substitua pelos fluxos Power Automate assim que o bloqueio de egresso for resolvido.

---

## Co-autoria e Edição Simultânea

### Regras para Edição Simultânea

1. Máximo de **5 usuários simultâneos** no arquivo (limitação do Excel Online)
2. Cada usuário edita apenas sua "zona de responsabilidade":
   - Time Operacional → DB_ATIVIDADES
   - Financeiro → DB_FINANCEIRO
   - Gestor/Coordenador → DB_EVENTOS
3. Nunca editar fórmulas no DASHBOARD ou ⚡ ALERTAS (são automáticas)
4. Em caso de conflito de edição: a versão mais recente vence, versões anteriores ficam no histórico

### Backup Automático

O SharePoint salva automaticamente a cada poucas segundos. Adicionalmente:
- Configure sincronização via OneDrive for Business no computador do gestor NEC
- Isso garante cópia local mesmo se o SharePoint ficar indisponível

---

## Governança de Dados

### Ciclo de Vida de um Evento

```
Evento cadastrado em DB_EVENTOS (Status: "a Realizar")
    │
    ▼
Atividades criadas em DB_ATIVIDADES
    │
    ▼
Fornecedores cadastrados em DB_FORNECEDORES
    │
    ▼
Orçamentos lançados em DB_FINANCEIRO
    │
    ▼
Evento realizado → Status atualizado para "Realizado"
    │
    ▼
NFs recebidas → DB_FINANCEIRO atualizado (Status Pag. → Pago)
    │
    ▼
Encerramento → todas as atividades "CONCLUÍDO"
    │
    ▼
Arquivo anual: mover registros do ano anterior para aba histórica
    (ou novo arquivo por ano: NEC_Eventos_2025.xlsx, NEC_Eventos_2026.xlsx)
```

### Campos Obrigatórios (nunca deixar em branco)

**DB_EVENTOS:** ID_Unico, Evento, Tipo, Status Evento, BU, Solicitante  
**DB_ATIVIDADES:** Evento (referência), Etapa, Atividade, Responsável, Status  
**DB_FINANCEIRO:** Evento (referência), Fornecedor, Orç. Previsto, Status Pag.

### Nomenclatura de Arquivos

```
Convenção: NEC_[Tipo]_[Ano]_v[Versão].xlsx
Exemplos:
  NEC_Eventos_2025_v4.xlsx
  NEC_Eventos_2026_v1.xlsx
  NEC_Budget_2025_v2.xlsx
```

---

## Métricas de Adoção (revisar mensalmente)

| Métrica | Meta |
|---|---|
| % registros com ID_Unico preenchido | 100% |
| % atividades com Prazo definido | ≥ 80% |
| % pagamentos com Status NF/ND preenchido | ≥ 90% |
| Relatórios semanais gerados sem erro | ≥ 95% |
| Tempo médio de atualização pós-evento | ≤ 3 dias úteis |

---

## Próximos Passos Imediatos

1. **[TI]** Solicitar criação do site SharePoint NEC e liberação do egresso `graph.microsoft.com`
2. **[Gestor NEC]** Definir lista de usuários e permissões
3. **[Operacional]** Após criação do site, executar plano de migração (Fases 1-4 acima)
4. **[TI + Operacional]** Testar co-autoria com 3 usuários simultâneos antes de ir ao ar
5. **[Gestor NEC]** Comunicar equipe sobre novo fluxo de trabalho e treinamento (30 min.)
