import nodemailer, { type Transporter } from "nodemailer";

type EmailConfirmacaoPayload = {
  nome: string;
  email: string;
  atividade: string;
  data: string;
  horario: string;
  participantes: number;
};

type EmailConfirmacaoResultado =
  | { enviado: true }
  | { enviado: false; motivo: "DISABLED" | "MISSING_CONFIG" };

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalizado = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalizado)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalizado)) {
    return false;
  }

  return undefined;
}

const SMTP_HOST = process.env.SMTP_HOST?.trim() || "smtp.hostinger.com";
const SMTP_PORT = Number(process.env.SMTP_PORT?.trim() || 465);
const SMTP_SECURE =
  (process.env.SMTP_SECURE?.trim() || (SMTP_PORT === 465 ? "true" : "false")) ===
  "true";
const SMTP_USER = process.env.SMTP_USER?.trim() || "";
const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";
const SMTP_FROM =
  process.env.SMTP_FROM?.trim() || `"Vagafogo Reservas" <${SMTP_USER}>`;

const EMAIL_CONFIRMATION_ENABLED = parseBooleanEnv(
  process.env.EMAIL_CONFIRMATION_ENABLED,
);

let cachedTransporter: Transporter | null = null;

export function isEmailConfirmacaoHabilitada(): boolean {
  if (EMAIL_CONFIRMATION_ENABLED !== undefined) {
    return EMAIL_CONFIRMATION_ENABLED;
  }

  return Boolean(SMTP_USER && SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER/SMTP_PASS não configurados.");
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  return cachedTransporter;
}

export async function enviarEmailConfirmacao(
  payload: EmailConfirmacaoPayload,
): Promise<EmailConfirmacaoResultado> {
  if (!isEmailConfirmacaoHabilitada()) {
    return { enviado: false, motivo: "DISABLED" };
  }

  if (!SMTP_USER || !SMTP_PASS) {
    console.error("[email] SMTP_USER/SMTP_PASS não configurados.");
    return { enviado: false, motivo: "MISSING_CONFIG" };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: payload.email,
    subject: "Confirmação de Reserva",
    html: `
      <h2>Olá, ${payload.nome}!</h2>
      <p>Recebemos sua reserva para a atividade <strong>${payload.atividade}</strong>.</p>
      <p><strong>Data:</strong> ${payload.data} <br />
         <strong>Horário:</strong> ${payload.horario} <br />
         <strong>Participantes:</strong> ${payload.participantes}</p>
      <p>Aguardamos você.</p>
    `,
  });

  console.log(`[email] confirmação enviada para ${payload.email}`);
  return { enviado: true };
}
