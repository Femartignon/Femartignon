// Office Script — Excel Online (Business)
// Uso: colado na ação "Excel Online (Business) → Run script" do flow
// "Orcamento Fornecedores -> Draft PO"
//
// O que faz:
// 1. Percorre a primeira planilha usada do arquivo de orçamento anexado.
// 2. Para cada linha, procura na coluna A (ou na primeira coluna com texto)
//    um rótulo conhecido de item de custo (aéreo, cenografia, hospedagem, etc.)
//    e pega o primeiro valor numérico encontrado na mesma linha.
// 3. Classifica cada item como "fee" (taxa de agência) ou "custo" (repassado
//    a terceiros / Nota de Débito), com base numa lista de palavras-chave.
// 4. Retorna um JSON com os itens encontrados e os totais separados.
//
// Ajuste as listas KEYWORDS_FEE / KEYWORDS_IGNORE conforme os modelos reais
// de planilha dos fornecedores forem aparecendo (nomes de rubricas variam).

interface OrcamentoItem {
  rotulo: string;
  valor: number;
  categoria: "fee" | "custo";
}

interface OrcamentoResultado {
  itens: OrcamentoItem[];
  totalFee: number;
  totalCusto: number;
  totalGeral: number;
  avisos: string[];
}

function main(workbook: ExcelScript.Workbook): OrcamentoResultado {
  const sheet = workbook.getActiveWorksheet();
  const range = sheet.getUsedRange();
  const values = range.getValues();

  // Rótulos que indicam que a linha é a TAXA DA AGÊNCIA (Fee), não custo de terceiro.
  const KEYWORDS_FEE = ["fee", "taxa de agenciamento", "taxa de servico", "honorarios", "management fee"];

  // Rótulos que devem ser ignorados (linhas de total/subtotal, para não somar em dobro).
  const KEYWORDS_IGNORE = ["total geral", "subtotal", "total:", "grand total", "valor total"];

  const itens: OrcamentoItem[] = [];
  const avisos: string[] = [];

  const normalize = (s: string): string =>
    s
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // remove acentos
      .trim();

  for (let row = 0; row < values.length; row++) {
    const rowValues = values[row];

    // primeira célula de texto não vazia da linha = rótulo do item
    let rotuloRaw = "";
    let rotuloCol = -1;
    for (let col = 0; col < rowValues.length; col++) {
      const cell = rowValues[col];
      if (typeof cell === "string" && cell.trim().length > 2) {
        rotuloRaw = cell.trim();
        rotuloCol = col;
        break;
      }
    }
    if (!rotuloRaw) continue;

    const rotuloNorm = normalize(rotuloRaw);
    if (KEYWORDS_IGNORE.some((k) => rotuloNorm.includes(k))) continue;

    // primeiro valor numérico na mesma linha, à direita do rótulo
    let valor: number | null = null;
    for (let col = rotuloCol + 1; col < rowValues.length; col++) {
      const cell = rowValues[col];
      if (typeof cell === "number" && cell > 0) {
        valor = cell;
        break;
      }
    }
    if (valor === null) continue;

    const categoria: "fee" | "custo" = KEYWORDS_FEE.some((k) => rotuloNorm.includes(k)) ? "fee" : "custo";

    itens.push({ rotulo: rotuloRaw, valor, categoria });
  }

  if (itens.length === 0) {
    avisos.push("Nenhum item de custo foi identificado automaticamente. Verifique o layout da planilha.");
  }

  const totalFee = itens.filter((i) => i.categoria === "fee").reduce((sum, i) => sum + i.valor, 0);
  const totalCusto = itens.filter((i) => i.categoria === "custo").reduce((sum, i) => sum + i.valor, 0);

  return {
    itens,
    totalFee,
    totalCusto,
    totalGeral: totalFee + totalCusto,
    avisos,
  };
}
