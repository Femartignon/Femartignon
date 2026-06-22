// ============================================================
// NEC Eventos — Power Query M: Queries de Automação
// Equipe: Neurociências & Acesso (NEC) — Takeda
// ============================================================
//
// COMO USAR (Excel Online ou Excel Desktop):
//   1. Abra NEC_Eventos_Reestruturado_v4.xlsx
//   2. Dados → Obter Dados → Iniciar Editor do Power Query
//   3. Para cada query abaixo: Página Inicial → Nova Fonte → Consulta em Branco
//      Abra o Editor Avançado e cole o bloco let...in completo
//   4. Renomeie a query com o nome indicado em cada bloco
//   5. Fechar e Carregar Para → selecione a planilha de destino
//
// NOTA SOBRE NOMES DE COLUNAS:
//   Nomes com caracteres especiais (%, /, .) usam [#"Nome Coluna"]
//   Nomes com apenas espaços e acentos funcionam com [Nome Coluna] normal
// ============================================================


// ────────────────────────────────────────────────────────────
// QUERY 1: PQ_EventosAtivos
// Nome para salvar: PQ_EventosAtivos
// Objetivo: Eventos com status "a Realizar", campos calculados
//           de dias até o evento e classificação de urgência.
// ────────────────────────────────────────────────────────────
let
    Source = Excel.CurrentWorkbook(){[Name="TblEventos"]}[Content],

    Typed = Table.TransformColumnTypes(Source, {
        {"ID", Int64.Type},
        {"Data Início", type date},
        {"Data Fim", type date},
        {"Status Evento", type text},
        {"BU", type text},
        {"Tipo", type text},
        {"Cidade", type text}
    }),

    Ativos = Table.SelectRows(Typed, each [Status Evento] = "a Realizar"),

    ComDias = Table.AddColumn(Ativos, "Dias até Evento", each
        if [Data Início] = null then null
        else Duration.Days([Data Início] - Date.From(DateTime.LocalNow())),
        Int64.Type
    ),

    ComUrgencia = Table.AddColumn(ComDias, "Urgência", each
        if [Dias até Evento] = null then "Sem data"
        else if [Dias até Evento] < 0 then "ATRASADO"
        else if [Dias até Evento] <= 7 then "CRÍTICO"
        else if [Dias até Evento] <= 30 then "ATENÇÃO"
        else "OK",
        type text
    ),

    Ordenado = Table.Sort(ComUrgencia, {{"Data Início", Order.Ascending}})
in
    Ordenado


// ────────────────────────────────────────────────────────────
// QUERY 2: PQ_AtividadesPendentes
// Nome para salvar: PQ_AtividadesPendentes
// Objetivo: Atividades com status PENDENTE ou ATRASADO,
//           calculando dias de atraso e nível de criticidade.
// ────────────────────────────────────────────────────────────
let
    Source = Excel.CurrentWorkbook(){[Name="TblAtividades"]}[Content],

    Typed = Table.TransformColumnTypes(Source, {
        {"ID", Int64.Type},
        {"Prazo", type date},
        {"Status", type text},
        {"Responsável", type text},
        {"% Conclusão", type number}
    }),

    Pendentes = Table.SelectRows(Typed, each
        [Status] = "PENDENTE" or [Status] = "ATRASADO"
    ),

    ComAtraso = Table.AddColumn(Pendentes, "Dias até Prazo", each
        if [Prazo] = null then null
        else Duration.Days([Prazo] - Date.From(DateTime.LocalNow())),
        Int64.Type
    ),

    ComCriticidade = Table.AddColumn(ComAtraso, "Criticidade", each
        if [Status] = "ATRASADO" then "CRÍTICO"
        else if [#"Dias até Prazo"] = null then "INDEFINIDO"
        else if [#"Dias até Prazo"] < 0 then "CRÍTICO"
        else if [#"Dias até Prazo"] <= 7 then "ALTO"
        else if [#"Dias até Prazo"] <= 30 then "MÉDIO"
        else "BAIXO",
        type text
    ),

    Ordenado = Table.Sort(ComCriticidade, {{"Prazo", Order.Ascending}})
in
    Ordenado


// ────────────────────────────────────────────────────────────
// QUERY 3: PQ_FinanceiroPendente
// Nome para salvar: PQ_FinanceiroPendente
// Objetivo: Registros financeiros com status de pagamento
//           Pendente ou A preencher, com desvio orçamentário.
// ────────────────────────────────────────────────────────────
let
    Source = Excel.CurrentWorkbook(){[Name="TblFinanceiro"]}[Content],

    Typed = Table.TransformColumnTypes(Source, {
        {"ID", Int64.Type},
        {"Orç. Previsto", Currency.Type},
        {"Real. FY2025", Currency.Type},
        {"Real. FY2026", Currency.Type},
        {"Total Evento", Currency.Type},
        {"Status Pag.", type text},
        {"Status NF/ND", type text}
    }),

    Pendentes = Table.SelectRows(Typed, each
        [#"Status Pag."] = "Pendente" or [#"Status Pag."] = "A preencher"
    ),

    ComDesvio = Table.AddColumn(Pendentes, "Desvio R$", each
        if [#"Orç. Previsto"] = null or [#"Orç. Previsto"] = 0 then null
        else [Total Evento] - [#"Orç. Previsto"],
        Currency.Type
    ),

    ComDesvioPerc = Table.AddColumn(ComDesvio, "Desvio %", each
        if [#"Orç. Previsto"] = null or [#"Orç. Previsto"] = 0 then null
        else ([Total Evento] - [#"Orç. Previsto"]) / [#"Orç. Previsto"],
        type number
    ),

    ComPrioridade = Table.AddColumn(ComDesvioPerc, "Prioridade", each
        if [#"Status NF/ND"] = "NF recebida" and [#"Status Pag."] = "Pendente" then "PAGAR AGORA"
        else if [#"Status Pag."] = "Pendente" then "SOLICITAR NF"
        else "A PREENCHER",
        type text
    ),

    Ordenado = Table.Sort(ComPrioridade, {{"Prioridade", Order.Ascending}, {"Total Evento", Order.Descending}})
in
    Ordenado


// ────────────────────────────────────────────────────────────
// QUERY 4: PQ_Dashboard
// Nome para salvar: PQ_Dashboard
// Objetivo: Visão consolidada — métricas de eventos, atividades
//           e financeiro em uma única tabela.
// ────────────────────────────────────────────────────────────
let
    // ── Eventos ──────────────────────────────────────────────
    SrcEventos = Excel.CurrentWorkbook(){[Name="TblEventos"]}[Content],
    EvTyped = Table.TransformColumnTypes(SrcEventos, {
        {"Status Evento", type text},
        {"BU", type text},
        {"Ano", Int64.Type}
    }),

    // ── Atividades ───────────────────────────────────────────
    SrcAtividades = Excel.CurrentWorkbook(){[Name="TblAtividades"]}[Content],
    AtTyped = Table.TransformColumnTypes(SrcAtividades, {
        {"Status", type text},
        {"% Conclusão", type number}
    }),

    // ── Financeiro ───────────────────────────────────────────
    SrcFin = Excel.CurrentWorkbook(){[Name="TblFinanceiro"]}[Content],
    FinTyped = Table.TransformColumnTypes(SrcFin, {
        {"Orç. Previsto", Currency.Type},
        {"Total Evento", Currency.Type},
        {"Status Pag.", type text}
    }),

    TotalOrcado   = List.Sum(FinTyped[#"Orç. Previsto"]),
    TotalRealizado = List.Sum(FinTyped[Total Evento]),
    PagPendentes  = Table.RowCount(Table.SelectRows(FinTyped, each
        [#"Status Pag."] = "Pendente" or [#"Status Pag."] = "A preencher"
    )),

    // ── Tabela consolidada ────────────────────────────────────
    Dashboard = #table(
        type table [Métrica = text, Valor = any, Categoria = text],
        {
            {"Total Eventos",      Table.RowCount(EvTyped),                                                                             "Eventos"},
            {"Eventos a Realizar", Table.RowCount(Table.SelectRows(EvTyped, each [Status Evento] = "a Realizar")),                      "Eventos"},
            {"Eventos Realizados", Table.RowCount(Table.SelectRows(EvTyped, each [Status Evento] = "Realizado")),                       "Eventos"},
            {"Eventos Cancelados", Table.RowCount(Table.SelectRows(EvTyped, each [Status Evento] = "Cancelado")),                       "Eventos"},

            {"Total Atividades",       Table.RowCount(AtTyped),                                                                         "Atividades"},
            {"Atividades Pendentes",   Table.RowCount(Table.SelectRows(AtTyped, each [Status] = "PENDENTE")),                           "Atividades"},
            {"Atividades Atrasadas",   Table.RowCount(Table.SelectRows(AtTyped, each [Status] = "ATRASADO")),                           "Atividades"},
            {"Atividades Concluídas",  Table.RowCount(Table.SelectRows(AtTyped, each [Status] = "CONCLUÍDO")),                          "Atividades"},

            {"Total Orçado (R$)",              TotalOrcado,                    "Financeiro"},
            {"Total Realizado (R$)",           TotalRealizado,                 "Financeiro"},
            {"Desvio Orçamentário (R$)",       TotalRealizado - TotalOrcado,   "Financeiro"},
            {"Pagamentos Pendentes (qtd)",     PagPendentes,                   "Financeiro"}
        }
    )
in
    Dashboard
