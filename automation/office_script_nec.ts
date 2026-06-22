/**
 * NEC Eventos — Office Script: Relatório Semanal Automático
 * Equipe: Neurociências & Acesso (NEC) — Takeda
 *
 * Como usar:
 *   1. Abra NEC_Eventos_Reestruturado_v4.xlsx no Excel Online (Microsoft 365)
 *   2. Clique em Automatizar → Novo Script
 *   3. Cole este código completo e clique em Salvar
 *   4. Execute manualmente ou agende via Power Automate (trigger: recorrência semanal)
 *
 * Pré-requisito: tabelas nomeadas TblEventos, TblAtividades, TblFinanceiro
 * devem existir na pasta de trabalho (já presentes na v4).
 */

function main(workbook: ExcelScript.Workbook): void {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7Dias = new Date(hoje.getTime() + 7 * 86400000);
  const em30Dias = new Date(hoje.getTime() + 30 * 86400000);

  // ── Coletar dados das tabelas ──────────────────────────────────────────────
  const tblEventos = workbook.getTable("TblEventos");
  const tblAtividades = workbook.getTable("TblAtividades");
  const tblFinanceiro = workbook.getTable("TblFinanceiro");

  const evRows = tblEventos.getRangeBetweenHeaderAndTotal().getValues();
  const atRows = tblAtividades.getRangeBetweenHeaderAndTotal().getValues();
  const finRows = tblFinanceiro.getRangeBetweenHeaderAndTotal().getValues();

  // ── Índices DB_EVENTOS (zero-based) ───────────────────────────────────────
  // A=0 ID, B=1 ID_Unico, C=2 Flag, D=3 Evento, E=4 Tipo, F=5 EM, G=6 Status,
  // H=7 Status EM, I=8 Ano, J=9 Trimestre, K=10 DataInicio, ...
  const EV_NOME = 3;
  const EV_STATUS = 6;
  const EV_DATA_INICIO = 10;
  const EV_CIDADE = 15;
  const EV_BU = 12;

  // ── Índices DB_ATIVIDADES (zero-based) ────────────────────────────────────
  // A=0 ID, B=1 Evento, C=2 Etapa, D=3 Atividade, E=4 Responsável,
  // F=5 Prazo, G=6 %Conclusão, H=7 Status, I=8 Observações
  const AT_EVENTO = 1;
  const AT_ETAPA = 2;
  const AT_ATIVIDADE = 3;
  const AT_RESPONSAVEL = 4;
  const AT_PRAZO = 5;
  const AT_STATUS = 7;

  // ── Índices DB_FINANCEIRO (zero-based) ────────────────────────────────────
  // A=0 ID, B=1 Evento, C=2 EM, D=3 FY, E=4 Fornecedor, F=5 Tipo Custo,
  // G=6 PO/WF, H=7 Orç.Prev, I=8 Real2025, J=9 Real2026, K=10 TotalEvento,
  // L=11 StatusPag, M=12 StatusNF, N=13 Obs
  const FIN_EVENTO = 1;
  const FIN_FORNECEDOR = 4;
  const FIN_ORC_PREV = 7;
  const FIN_TOTAL = 10;
  const FIN_STATUS_PAG = 11;

  // ── Análises ───────────────────────────────────────────────────────────────
  const eventosAtrasados: string[][] = [];
  const eventosProximos7d: string[][] = [];
  const eventosProximos30d: string[][] = [];
  let totalEventos = 0;
  let eventosRealizados = 0;

  for (const row of evRows) {
    const nome = String(row[EV_NOME] ?? "").trim();
    if (!nome) continue;
    totalEventos++;

    const status = String(row[EV_STATUS] ?? "").trim();
    if (status === "Realizado") eventosRealizados++;

    const dataRaw = row[EV_DATA_INICIO];
    if (status === "a Realizar" && dataRaw && typeof dataRaw === "number") {
      const dataEvento = excelSerialToDate(dataRaw as number);
      dataEvento.setHours(0, 0, 0, 0);

      if (dataEvento < hoje) {
        eventosAtrasados.push([nome, String(row[EV_BU] ?? ""), String(row[EV_CIDADE] ?? ""), formatDate(dataEvento)]);
      } else if (dataEvento <= em7Dias) {
        eventosProximos7d.push([nome, String(row[EV_BU] ?? ""), String(row[EV_CIDADE] ?? ""), formatDate(dataEvento)]);
      } else if (dataEvento <= em30Dias) {
        eventosProximos30d.push([nome, String(row[EV_BU] ?? ""), String(row[EV_CIDADE] ?? ""), formatDate(dataEvento)]);
      }
    }
  }

  const atividadesAtrasadas: string[][] = [];
  const atividadesProximas: string[][] = [];
  let atividadesPendentes = 0;
  let atividadesConcluidas = 0;

  for (const row of atRows) {
    const ativ = String(row[AT_ATIVIDADE] ?? "").trim();
    if (!ativ) continue;

    const status = String(row[AT_STATUS] ?? "").trim().toUpperCase();
    if (status === "CONCLUÍDO" || status === "CONCLUIDO") {
      atividadesConcluidas++;
      continue;
    }
    if (status === "PENDENTE" || status === "ATRASADO") {
      atividadesPendentes++;
      const prazoRaw = row[AT_PRAZO];
      if (prazoRaw && typeof prazoRaw === "number") {
        const prazo = excelSerialToDate(prazoRaw as number);
        prazo.setHours(0, 0, 0, 0);
        const linha = [
          String(row[AT_EVENTO] ?? ""),
          String(row[AT_ETAPA] ?? ""),
          ativ,
          String(row[AT_RESPONSAVEL] ?? ""),
          formatDate(prazo)
        ];
        if (prazo < hoje || status === "ATRASADO") {
          atividadesAtrasadas.push(linha);
        } else if (prazo <= em7Dias) {
          atividadesProximas.push(linha);
        }
      }
    }
  }

  const pagamentoPendente: string[][] = [];
  let totalOrcado = 0;
  let totalRealizado = 0;

  for (const row of finRows) {
    const evento = String(row[FIN_EVENTO] ?? "").trim();
    if (!evento) continue;

    const statusPag = String(row[FIN_STATUS_PAG] ?? "").trim();
    const orc = Number(row[FIN_ORC_PREV]) || 0;
    const real = Number(row[FIN_TOTAL]) || 0;
    totalOrcado += orc;
    totalRealizado += real;

    if (statusPag === "Pendente" || statusPag === "A preencher") {
      pagamentoPendente.push([
        evento,
        String(row[FIN_FORNECEDOR] ?? ""),
        formatBRL(orc),
        statusPag
      ]);
    }
  }

  // ── Criar / recriar aba RELATORIO_SEMANAL ─────────────────────────────────
  let wsRel = workbook.getWorksheet("RELATORIO_SEMANAL");
  if (wsRel) {
    wsRel.delete();
  }
  wsRel = workbook.addWorksheet("RELATORIO_SEMANAL");

  // Mover para posição 2 (após ALERTAS se existir)
  const wsAlertas = workbook.getWorksheet("⚡ ALERTAS");
  if (wsAlertas) {
    wsRel.setPosition(wsAlertas.getPosition() + 1);
  } else {
    wsRel.setPosition(1);
  }

  // ── Escrever cabeçalho ─────────────────────────────────────────────────────
  let linha = 1;

  setCelula(wsRel, linha, 1, `RELATÓRIO SEMANAL NEC — ${formatDate(hoje)}`);
  estilizarTitulo(wsRel, linha, 1, "1F4E79", "FFFFFF", 16);
  wsRel.getRange(`A${linha}:H${linha}`).merge();
  linha++;

  setCelula(wsRel, linha, 1, `Gerado automaticamente por Office Script | Semana de ${formatDate(hoje)}`);
  wsRel.getRange(`A${linha}:H${linha}`).merge();
  wsRel.getRange(`A${linha}`).getFormat().getFont().setColor("595959");
  wsRel.getRange(`A${linha}`).getFormat().getFont().setSize(9);
  linha += 2;

  // ── KPIs resumo ───────────────────────────────────────────────────────────
  setCelula(wsRel, linha, 1, "RESUMO EXECUTIVO");
  estilizarTitulo(wsRel, linha, 1, "2E75B6", "FFFFFF", 11);
  wsRel.getRange(`A${linha}:H${linha}`).merge();
  linha++;

  const kpis = [
    ["Total de Eventos", totalEventos, "Realizados", eventosRealizados],
    ["Eventos Atrasados", eventosAtrasados.length, "Próximos 7 dias", eventosProximos7d.length],
    ["Atividades Pendentes", atividadesPendentes, "Atividades Atrasadas", atividadesAtrasadas.length],
    ["Pagamentos Pendentes", pagamentoPendente.length, "Orçado Total", formatBRL(totalOrcado)],
  ];

  for (const [k1, v1, k2, v2] of kpis) {
    setCelula(wsRel, linha, 1, String(k1));
    setCelula(wsRel, linha, 2, String(v1));
    setCelula(wsRel, linha, 4, String(k2));
    setCelula(wsRel, linha, 5, String(v2));

    wsRel.getRange(`A${linha}`).getFormat().getFont().setBold(true);
    wsRel.getRange(`D${linha}`).getFormat().getFont().setBold(true);
    wsRel.getRange(`B${linha}`).getFormat().getFont().setColor(Number(v1) > 0 ? "C00000" : "375623");
    linha++;
  }
  linha++;

  // ── Seção: Eventos Atrasados ───────────────────────────────────────────────
  if (eventosAtrasados.length > 0) {
    linha = escreverSecao(wsRel, linha, "EVENTOS ATRASADOS", "C00000",
      ["Evento", "BU", "Cidade", "Data Início"],
      eventosAtrasados
    );
    linha++;
  }

  // ── Seção: Eventos Próximos 7 dias ────────────────────────────────────────
  if (eventosProximos7d.length > 0) {
    linha = escreverSecao(wsRel, linha, "EVENTOS NOS PRÓXIMOS 7 DIAS", "E97E16",
      ["Evento", "BU", "Cidade", "Data Início"],
      eventosProximos7d
    );
    linha++;
  }

  // ── Seção: Próximos 30 dias ────────────────────────────────────────────────
  if (eventosProximos30d.length > 0) {
    linha = escreverSecao(wsRel, linha, "EVENTOS NOS PRÓXIMOS 30 DIAS", "375623",
      ["Evento", "BU", "Cidade", "Data Início"],
      eventosProximos30d
    );
    linha++;
  }

  // ── Seção: Atividades Atrasadas ────────────────────────────────────────────
  if (atividadesAtrasadas.length > 0) {
    linha = escreverSecao(wsRel, linha, "ATIVIDADES ATRASADAS / CRÍTICAS", "C00000",
      ["Evento", "Etapa", "Atividade", "Responsável", "Prazo"],
      atividadesAtrasadas
    );
    linha++;
  }

  // ── Seção: Atividades com Prazo em 7 dias ─────────────────────────────────
  if (atividadesProximas.length > 0) {
    linha = escreverSecao(wsRel, linha, "ATIVIDADES COM PRAZO EM 7 DIAS", "E97E16",
      ["Evento", "Etapa", "Atividade", "Responsável", "Prazo"],
      atividadesProximas
    );
    linha++;
  }

  // ── Seção: Pagamentos Pendentes ────────────────────────────────────────────
  if (pagamentoPendente.length > 0) {
    linha = escreverSecao(wsRel, linha, "PAGAMENTOS PENDENTES / A PREENCHER", "7030A0",
      ["Evento", "Fornecedor", "Orç. Previsto", "Status"],
      pagamentoPendente
    );
    linha++;
  }

  // ── Rodapé ────────────────────────────────────────────────────────────────
  setCelula(wsRel, linha, 1, "Relatório gerado por: Office Script NEC v1.0 | Para dúvidas contate o time de Excelência Operacional NEC");
  wsRel.getRange(`A${linha}:H${linha}`).merge();
  wsRel.getRange(`A${linha}`).getFormat().getFont().setItalic(true);
  wsRel.getRange(`A${linha}`).getFormat().getFont().setSize(8);
  wsRel.getRange(`A${linha}`).getFormat().getFont().setColor("595959");

  // Ajustar largura das colunas
  wsRel.getRange("A:A").getFormat().setColumnWidth(35);
  wsRel.getRange("B:B").getFormat().setColumnWidth(20);
  wsRel.getRange("C:C").getFormat().setColumnWidth(25);
  wsRel.getRange("D:D").getFormat().setColumnWidth(20);
  wsRel.getRange("E:E").getFormat().setColumnWidth(30);
  wsRel.getRange("F:F").getFormat().setColumnWidth(15);
  wsRel.getRange("G:G").getFormat().setColumnWidth(15);
  wsRel.getRange("H:H").getFormat().setColumnWidth(15);

  console.log(`Relatório gerado com sucesso: ${totalEventos} eventos, ${atividadesPendentes} atividades pendentes, ${pagamentoPendente.length} pagamentos pendentes.`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function excelSerialToDate(serial: number): Date {
  // Excel serial: 1 = 01/01/1900, com ajuste do bug do ano 1900
  const msPerDay = 86400000;
  const epoch = new Date(1899, 11, 30).getTime();
  return new Date(epoch + serial * msPerDay);
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatBRL(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setCelula(ws: ExcelScript.Worksheet, row: number, col: number, valor: string): void {
  ws.getCell(row - 1, col - 1).setValue(valor);
}

function estilizarTitulo(
  ws: ExcelScript.Worksheet,
  row: number,
  col: number,
  bgHex: string,
  fgHex: string,
  size: number
): void {
  const cell = ws.getCell(row - 1, col - 1);
  const fmt = cell.getFormat();
  fmt.getFill().setColor(bgHex);
  fmt.getFont().setColor(fgHex);
  fmt.getFont().setBold(true);
  fmt.getFont().setSize(size);
  fmt.setVerticalAlignment(ExcelScript.VerticalAlignment.center);
  fmt.setRowHeight(size * 2.2);
}

function escreverSecao(
  ws: ExcelScript.Worksheet,
  startRow: number,
  titulo: string,
  cor: string,
  headers: string[],
  dados: string[][]
): number {
  let linha = startRow;

  // Título da seção
  setCelula(ws, linha, 1, titulo);
  estilizarTitulo(ws, linha, 1, cor, "FFFFFF", 10);
  ws.getRange(`A${linha}:H${linha}`).merge();
  linha++;

  // Headers
  for (let c = 0; c < headers.length; c++) {
    const cell = ws.getCell(linha - 1, c);
    cell.setValue(headers[c]);
    const fmt = cell.getFormat();
    fmt.getFill().setColor("D9E1F2");
    fmt.getFont().setBold(true);
    fmt.getFont().setSize(9);
    fmt.getBorders().getItem(ExcelScript.BorderIndex.edgeBottom).setStyle(ExcelScript.BorderLineStyle.thin);
  }
  linha++;

  // Dados
  for (const row of dados) {
    for (let c = 0; c < row.length; c++) {
      const cell = ws.getCell(linha - 1, c);
      cell.setValue(row[c]);
      cell.getFormat().getFont().setSize(9);
      // Zebra striping
      if ((linha % 2) === 0) {
        cell.getFormat().getFill().setColor("F2F2F2");
      }
    }
    linha++;
  }

  if (dados.length === 0) {
    setCelula(ws, linha, 1, "Nenhum item encontrado.");
    ws.getCell(linha - 1, 0).getFormat().getFont().setItalic(true);
    ws.getCell(linha - 1, 0).getFormat().getFont().setColor("595959");
    linha++;
  }

  return linha;
}
