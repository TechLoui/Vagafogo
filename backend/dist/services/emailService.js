"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
exports.enviarEmailConfirmacao = enviarEmailConfirmacao;
const nodemailer_1 = __importDefault(require("nodemailer"));
const parseNumber = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: parseNumber(process.env.SMTP_PORT, 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
    auth: {
        user: process.env.SMTP_USER || "financeiro@nagasistemas.com",
        pass: process.env.SMTP_PASS || "Naga@1327",
    },
    pool: (process.env.SMTP_POOL ?? "true") !== "false",
    maxConnections: parseNumber(process.env.SMTP_MAX_CONNECTIONS, 1),
    maxMessages: parseNumber(process.env.SMTP_MAX_MESSAGES, 50),
    rateDelta: parseNumber(process.env.SMTP_RATE_DELTA, 1000),
    rateLimit: parseNumber(process.env.SMTP_RATE_LIMIT, 3),
    connectionTimeout: parseNumber(process.env.SMTP_CONNECTION_TIMEOUT, 15000),
    greetingTimeout: parseNumber(process.env.SMTP_GREETING_TIMEOUT, 10000),
    socketTimeout: parseNumber(process.env.SMTP_SOCKET_TIMEOUT, 20000),
};
exports.transporter = nodemailer_1.default.createTransport(smtpConfig);
exports.transporter
    .verify()
    .then(() => console.log("[email] SMTP pronto para uso"))
    .catch((error) => console.error("[email] Falha ao validar SMTP:", error?.message || error));
async function enviarEmailConfirmacao({ nome, email, atividade, data, horario, participantes, }) {
    await exports.transporter.sendMail({
        from: `"Vagafogo Reservas" <financeiro@nagasistemas.com>`,
        to: email,
        subject: "Confirmação de Reserva",
        html: `
      <h2>Olá, ${nome}!</h2>
      <p>Recebemos sua reserva para a atividade <strong>${atividade}</strong>.</p>
      <p><strong>Data:</strong> ${data} <br />
         <strong>Horário:</strong> ${horario} <br />
         <strong>Participantes:</strong> ${participantes}</p>
      <p>Aguardamos você!</p>
    `,
    });
    console.log(`[email] Enviado para ${email}`);
}
