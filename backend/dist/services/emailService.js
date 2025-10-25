"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
exports.enviarEmailConfirmacao = enviarEmailConfirmacao;
const nodemailer_1 = __importDefault(require("nodemailer"));
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.hostinger.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? (SMTP_PORT === 465 ? "true" : "false"))
    .toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER ?? "financeiro@nagasistemas.com";
const SMTP_PASS = process.env.SMTP_PASS ?? "Naga@1327";
const SMTP_NAME = process.env.SMTP_FROM_NAME ?? "Vagafogo Reservas";
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;
const MAX_RETRIES = Number(process.env.SMTP_MAX_RETRIES ?? 3);
const RETRY_DELAY_MS = Number(process.env.SMTP_RETRY_DELAY_MS ?? 3000);
const RETRIABLE_ERRORS = new Set([
    "ETIMEDOUT",
    "ECONNECTION",
    "ESOCKET",
    "ECONNRESET",
    "EAI_AGAIN",
]);
exports.transporter = nodemailer_1.default.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS ?? 1),
    maxMessages: Number(process.env.SMTP_MAX_MESSAGES ?? 100),
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT ?? 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT ?? 7000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT ?? 15000),
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    tls: {
        minVersion: "TLSv1.2",
        servername: SMTP_HOST,
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
    },
});
let transporterVerified = null;
async function ensureTransporterReady() {
    if (!transporterVerified) {
        transporterVerified = exports.transporter
            .verify()
            .then(() => {
            console.log(`[email] SMTP ready at ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`);
        })
            .catch((error) => {
            transporterVerified = null;
            console.error("[email] SMTP verification failed:", error?.message);
            throw error;
        });
    }
    return transporterVerified;
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function shouldRetry(error, attempt) {
    if (attempt >= MAX_RETRIES) {
        return false;
    }
    const code = error?.code;
    return code ? RETRIABLE_ERRORS.has(code) : false;
}
function sanitize(value) {
    return value.replace(/[&<>"]/g, (char) => {
        switch (char) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            default:
                return char;
        }
    });
}
function buildEmailHtml({ nome, atividade, data, horario, participantes, }) {
    return `
    <h2>Ola, ${sanitize(nome)}!</h2>
    <p>Recebemos sua reserva para a atividade <strong>${sanitize(atividade)}</strong>.</p>
    <p>
      <strong>Data:</strong> ${sanitize(data)}<br />
      <strong>Horario:</strong> ${sanitize(horario)}<br />
      <strong>Participantes:</strong> ${participantes}
    </p>
    <p>Aguardamos voce.</p>
  `;
}
async function enviarEmailConfirmacao(payload) {
    await ensureTransporterReady();
    let lastError = new Error("Email sending failed");
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const info = await exports.transporter.sendMail({
                from: `${SMTP_NAME} <${SMTP_FROM}>`,
                to: payload.email,
                subject: "Confirmacao de Reserva",
                html: buildEmailHtml(payload),
            });
            console.log(`[email] confirmacao enviada para ${payload.email} | tentativa ${attempt} | id: ${info.messageId}`);
            return;
        }
        catch (error) {
            lastError = error;
            const message = error?.message ?? "unknown";
            const code = error?.code ?? "UNKNOWN";
            console.error(`[email] erro tentativa ${attempt}/${MAX_RETRIES} (${code}): ${message}`);
            if (shouldRetry(error, attempt)) {
                await delay(RETRY_DELAY_MS * attempt);
                continue;
            }
            break;
        }
    }
    throw lastError;
}
