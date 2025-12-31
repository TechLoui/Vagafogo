import * as fs from "fs";
import * as path from "path";
import cron from "node-cron";

const dataDir = path.join(process.cwd(), ".dados");
const cartaoFile = path.join(dataDir, "cartoes.json");

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function resetFile() {
  ensureDir();
  fs.writeFileSync(cartaoFile, JSON.stringify([], null, 2));
  console.log("[cartao] Arquivo resetado às 21:30");
}

export function initCartaoService() {
  ensureDir();
  if (!fs.existsSync(cartaoFile)) {
    fs.writeFileSync(cartaoFile, JSON.stringify([], null, 2));
  }
  cron.schedule("30 21 * * *", resetFile);
}

export function salvarCartao(dados: any) {
  try {
    ensureDir();
    let cartoes = [];
    if (fs.existsSync(cartaoFile)) {
      const content = fs.readFileSync(cartaoFile, "utf-8");
      cartoes = JSON.parse(content || "[]");
    }
    cartoes.push({
      ...dados,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(cartaoFile, JSON.stringify(cartoes, null, 2));
    console.log(`[cartao] Dados salvos. Total: ${cartoes.length}`);
  } catch (err) {
    console.error("[cartao] Erro ao salvar:", err);
  }
}

export function obterCartoes(): any[] {
  try {
    if (fs.existsSync(cartaoFile)) {
      const content = fs.readFileSync(cartaoFile, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("[cartao] Erro ao ler:", err);
  }
  return [];
}
