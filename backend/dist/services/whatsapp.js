"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarWhatsApp = iniciarWhatsApp;
exports.desconectarWhatsApp = desconectarWhatsApp;
exports.obterStatusWhatsApp = obterStatusWhatsApp;
exports.enviarConfirmacaoWhatsapp = enviarConfirmacaoWhatsapp;
exports.processarPendentesWhatsapp = processarPendentesWhatsapp;
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
const parseNumber = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const INIT_MAX_RETRIES = parseNumber(process.env.WHATSAPP_INIT_RETRIES, 3);
const INIT_RETRY_DELAY_MS = parseNumber(process.env.WHATSAPP_INIT_RETRY_DELAY_MS, 5000);
let client = null;
let status = "idle";
let qrDataUrl = null;
let lastError = null;
let lastQrAt = null;
let lastInfo = null;
let initializing = false;
let processingPending = false;
let initRetries = 0;
let retryTimer = null;
let lastConnectedAt = null;
const clearRetryTimer = () => {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
};
const scheduleRetry = (reason) => {
    if (INIT_MAX_RETRIES <= 0)
        return;
    if (initRetries >= INIT_MAX_RETRIES)
        return;
    initRetries += 1;
    clearRetryTimer();
    retryTimer = setTimeout(() => {
        retryTimer = null;
        iniciarWhatsApp();
    }, INIT_RETRY_DELAY_MS);
    if (reason) {
        lastError = reason;
    }
};
const handleInitFailure = (error) => {
    status = "disconnected";
    initializing = false;
    lastError = error?.message || "init_error";
    qrDataUrl = null;
    lastInfo = null;
    lastConnectedAt = null;
    if (client) {
        client.destroy().catch(() => undefined);
    }
    client = null;
    scheduleRetry(lastError);
};
const parseDateValue = (value) => {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    const maybeDate = value.toDate?.();
    if (maybeDate instanceof Date)
        return maybeDate;
    if (typeof value === "string") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime()))
            return parsed;
    }
    return null;
};
const shouldProcessReserva = (reserva, cutoff) => {
    if (!cutoff)
        return true;
    const referencia = parseDateValue(reserva.dataPagamento) ??
        parseDateValue(reserva.criadoEm) ??
        parseDateValue(reserva.atualizadoEm);
    if (!referencia)
        return false;
    return referencia >= cutoff;
};
const obterNumeroWhatsapp = async (telefone) => {
    if (!client)
        return null;
    try {
        const id = await client.getNumberId(telefone);
        return id?._serialized ?? null;
    }
    catch (error) {
        console.warn("[whatsapp] Erro ao validar numero:", error);
        return null;
    }
};
function iniciarWhatsApp() {
    if (client || initializing) {
        return;
    }
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    clearRetryTimer();
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
        initRetries = 0;
        qrDataUrl = null;
        lastError = null;
        lastInfo = {
            wid: client?.info?.wid?._serialized,
            pushname: client?.info?.pushname,
        };
        lastConnectedAt = new Date();
        void processarPendentesWhatsapp();
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
        const reasonText = reason?.toString() || "disconnected";
        lastError = reasonText;
        qrDataUrl = null;
        lastInfo = null;
        client = null;
        lastConnectedAt = null;
        if (!reasonText.toLowerCase().includes("logout")) {
            scheduleRetry(reasonText);
        }
    });
    client.initialize().catch((error) => {
        console.error("[whatsapp] Falha ao inicializar:", error);
        handleInitFailure(error);
    });
}
async function desconectarWhatsApp() {
    clearRetryTimer();
    initRetries = 0;
    lastConnectedAt = null;
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
async function enviarConfirmacaoWhatsapp(reservaId, reserva, configOverride) {
    iniciarWhatsApp();
    const config = configOverride ?? (await obterConfig());
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
    const whatsappId = await obterNumeroWhatsapp(telefone);
    if (!whatsappId) {
        return { enviado: false, motivo: "telefone_sem_whatsapp" };
    }
    try {
        await client.sendMessage(whatsappId, mensagem);
    }
    catch (error) {
        return { enviado: false, motivo: error?.message || "erro_envio" };
    }
    return {
        enviado: true,
        mensagem,
        telefone,
    };
}
async function processarPendentesWhatsapp() {
    if (processingPending) {
        return { enviados: 0, falhas: 0, motivo: "em_andamento" };
    }
    processingPending = true;
    try {
        iniciarWhatsApp();
        const config = await obterConfig();
        if (!config.ativo) {
            return { enviados: 0, falhas: 0, motivo: "config_desativado" };
        }
        if (!client || status !== "ready") {
            return { enviados: 0, falhas: 0, motivo: "whatsapp_nao_conectado" };
        }
        const statusElegiveis = ["pago", "confirmado", "Pago", "Confirmado"];
        const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "reservas"), (0, firestore_1.where)("status", "in", statusElegiveis)));
        let enviados = 0;
        let falhas = 0;
        for (const docSnap of snapshot.docs) {
            const reserva = docSnap.data();
            if (!shouldProcessReserva(reserva, lastConnectedAt)) {
                continue;
            }
            if (reserva.whatsappEnviado === true) {
                continue;
            }
            try {
                const resultado = await enviarConfirmacaoWhatsapp(docSnap.id, reserva, config);
                if (resultado.enviado) {
                    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, "reservas", docSnap.id), {
                        whatsappEnviado: true,
                        dataWhatsappEnviado: new Date(),
                        whatsappMensagem: resultado.mensagem ?? "",
                        whatsappTelefone: resultado.telefone ?? "",
                    });
                    enviados += 1;
                }
                else {
                    falhas += 1;
                    console.warn(`[whatsapp] pendente nao enviado ${docSnap.id}: ${resultado.motivo ?? "erro"}`);
                }
            }
            catch (error) {
                falhas += 1;
                console.error(`[whatsapp] erro ao enviar ${docSnap.id}:`, error);
            }
        }
        return { enviados, falhas };
    }
    catch (error) {
        console.error("[whatsapp] erro ao processar pendentes:", error);
        return { enviados: 0, falhas: 0, motivo: "erro" };
    }
    finally {
        processingPending = false;
    }
}
