"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarWhatsApp = iniciarWhatsApp;
exports.desconectarWhatsApp = desconectarWhatsApp;
exports.obterStatusWhatsApp = obterStatusWhatsApp;
exports.enviarConfirmacaoWhatsapp = enviarConfirmacaoWhatsapp;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_1 = __importDefault(require("qrcode"));
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const TEMPLATE_PADRAO = "Ola {nome}! Sua reserva foi confirmada para {datareserva} {horario}. Atividade: {atividade}. Participantes: {participantes}.";
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});
const formatCurrency = (valor) => currencyFormatter.format(Number.isFinite(valor) ? valor : 0);
let client = null;
let status = "idle";
let qrDataUrl = null;
let lastError = null;
let lastQrAt = null;
let lastInfo = null;
let initializing = false;
function iniciarWhatsApp() {
    if (client || initializing) {
        return;
    }
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    initializing = true;
    status = "initializing";
    lastError = null;
    client = new whatsapp_web_js_1.Client({
        authStrategy: new whatsapp_web_js_1.LocalAuth({ clientId: "vagafogo" }),
        puppeteer: {
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            ...(executablePath ? { executablePath } : {}),
        },
    });
    client.on("qr", async (qr) => {
        status = "qr";
        lastQrAt = Date.now();
        try {
            qrDataUrl = await qrcode_1.default.toDataURL(qr);
        }
        catch (error) {
            lastError = error?.message || "qr_error";
        }
    });
    client.on("ready", () => {
        status = "ready";
        initializing = false;
        qrDataUrl = null;
        lastError = null;
        lastInfo = {
            wid: client?.info?.wid?._serialized,
            pushname: client?.info?.pushname,
        };
    });
    client.on("authenticated", () => {
        status = "initializing";
        initializing = false;
        lastError = null;
    });
    client.on("auth_failure", (msg) => {
        status = "auth_failure";
        initializing = false;
        lastError = msg?.toString() || "auth_failure";
    });
    client.on("disconnected", (reason) => {
        status = "disconnected";
        initializing = false;
        lastError = reason?.toString() || "disconnected";
        qrDataUrl = null;
        lastInfo = null;
        client = null;
    });
    client.initialize().catch((error) => {
        status = "disconnected";
        initializing = false;
        lastError = error?.message || "init_error";
        qrDataUrl = null;
        lastInfo = null;
        client = null;
    });
}
async function desconectarWhatsApp() {
    if (!client) {
        status = "disconnected";
        return;
    }
    try {
        await client.logout();
    }
    finally {
        status = "disconnected";
        qrDataUrl = null;
        lastInfo = null;
        client = null;
    }
}
function obterStatusWhatsApp() {
    return {
        status,
        qr: qrDataUrl,
        lastError,
        lastQrAt: lastQrAt ? new Date(lastQrAt).toISOString() : null,
        info: lastInfo ?? undefined,
    };
}
const formatarDataReserva = (valor) => {
    if (!valor)
        return "";
    if (typeof valor === "string") {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }
        return valor;
    }
    if (valor instanceof Date) {
        const dia = String(valor.getDate()).padStart(2, "0");
        const mes = String(valor.getMonth() + 1).padStart(2, "0");
        const ano = valor.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }
    const maybeDate = valor.toDate?.();
    if (maybeDate instanceof Date) {
        return formatarDataReserva(maybeDate);
    }
    return "";
};
const montarMensagem = (template, reserva) => {
    const dados = {
        nome: reserva?.nome ?? "",
        datareserva: formatarDataReserva(reserva?.data),
        data: formatarDataReserva(reserva?.data),
        horario: reserva?.horario ?? "",
        atividade: reserva?.atividade ?? "",
        participantes: String(reserva?.participantes ?? ""),
        telefone: reserva?.telefone ?? "",
        valor: formatCurrency(Number(reserva?.valor ?? 0)),
        status: reserva?.status ?? "",
    };
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, chave) => {
        const valor = dados[chave];
        return valor !== undefined ? valor : match;
    });
};
const normalizarTelefone = (telefone) => {
    if (!telefone)
        return "";
    const digits = telefone.replace(/\D/g, "");
    if (!digits)
        return "";
    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
        return digits;
    }
    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }
    return digits;
};
const obterConfig = async () => {
    const ref = (0, firestore_1.doc)(firebase_1.db, "configuracoes", "whatsapp");
    const snap = await (0, firestore_1.getDoc)(ref);
    if (!snap.exists())
        return {};
    return snap.data();
};
async function enviarConfirmacaoWhatsapp(reservaId, reserva) {
    iniciarWhatsApp();
    const config = await obterConfig();
    if (!config.ativo) {
        return { enviado: false, motivo: "config_desativado" };
    }
    const telefone = normalizarTelefone(reserva?.telefone);
    if (!telefone) {
        return { enviado: false, motivo: "telefone_invalido" };
    }
    const template = (config.mensagemConfirmacao || TEMPLATE_PADRAO).trim();
    if (!template) {
        return { enviado: false, motivo: "mensagem_vazia" };
    }
    if (!client || status !== "ready") {
        return { enviado: false, motivo: "whatsapp_nao_conectado" };
    }
    const mensagem = montarMensagem(template, {
        ...reserva,
        id: reservaId,
    });
    await client.sendMessage(`${telefone}@c.us`, mensagem);
    return {
        enviado: true,
        mensagem,
        telefone,
    };
}
