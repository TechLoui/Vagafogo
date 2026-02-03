"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarEmailConfirmacao = enviarEmailConfirmacao;
// emailService.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
let cachedTransporter = null;
function getTransporter() {
    if (cachedTransporter)
        return cachedTransporter;
    const host = process.env.SMTP_HOST?.trim() || "smtp.hostinger.com";
    const portEnv = process.env.SMTP_PORT?.trim();
    const port = portEnv ? Number(portEnv) : 465;
    const secureEnv = process.env.SMTP_SECURE?.trim();
    const secure = secureEnv ? secureEnv === "true" : port === 465;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (!user || !pass) {
        throw new Error("SMTP_USER/SMTP_PASS não configurados.");
    }
    cachedTransporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
    return cachedTransporter;
}
async function enviarEmailConfirmacao({ nome, email, atividade, data, horario, participantes, }) {
    const from = process.env.SMTP_FROM?.trim() || `"Vagafogo Reservas" <${process.env.SMTP_USER}>`;
    await getTransporter().sendMail({
        from,
        to: email,
        subject: "Confirmação de Reserva",
        html: `
      <h2>Olá, ${nome}!</h2>
      <p>Recebemos sua reserva para a atividade <strong>${atividade}</strong>.</p>
      <p><strong>Data:</strong> ${data} <br />
         <strong>Horário:</strong> ${horario} <br />
         <strong>Participantes:</strong> ${participantes}</p>
      <p>Aguardamos você! 🌳</p>
    `,
    });
    console.log(`📧 E-mail enviado para ${email}`);
}
