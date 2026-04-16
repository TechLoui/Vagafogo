import nodemailer from "nodemailer";

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

const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.hostinger.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_SECURE =
  (process.env.SMTP_SECURE ?? (SMTP_PORT === 465 ? "true" : "false"))
    .toLowerCase() === "true";
const SMTP_USER = (process.env.SMTP_USER ?? "").trim();
const SMTP_PASS = (process.env.SMTP_PASS ?? "").trim();
const SMTP_NAME = process.env.SMTP_FROM_NAME ?? "Vagafogo Reservas";
const SMTP_FROM = (process.env.SMTP_FROM ?? SMTP_USER).trim();
const EMAIL_CONFIRMATION_ENABLED = parseBooleanEnv(
  process.env.EMAIL_CONFIRMATION_ENABLED,
);

const MAX_RETRIES = Number(process.env.SMTP_MAX_RETRIES ?? 3);
const RETRY_DELAY_MS = Number(process.env.SMTP_RETRY_DELAY_MS ?? 3000);
const RETRIABLE_ERRORS = new Set([
  "ETIMEDOUT",
  "ECONNECTION",
  "ESOCKET",
  "ECONNRESET",
  "EAI_AGAIN",
]);

let transporter: nodemailer.Transporter | null = null;
let transporterVerified: Promise<void> | null = null;

export function isEmailConfirmacaoHabilitada(): boolean {
  if (EMAIL_CONFIRMATION_ENABLED !== undefined) {
    return EMAIL_CONFIRMATION_ENABLED;
  }

  return Boolean(SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
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
  }

  return transporter;
}

async function ensureTransporterReady(): Promise<void> {
  if (!transporterVerified) {
    transporterVerified = getTransporter()
      .verify()
      .then(() => {
        console.log(
          `[email] SMTP ready at ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`,
        );
      })
      .catch((error) => {
        transporterVerified = null;
        console.error("[email] SMTP verification failed:", error?.message);
        throw error;
      });
  }
  return transporterVerified;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown, attempt: number) {
  if (attempt >= MAX_RETRIES) {
    return false;
  }

  const code = (error as { code?: string })?.code;
  return code ? RETRIABLE_ERRORS.has(code) : false;
}

function sanitize(value: string) {
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

function buildEmailHtml({
  nome,
  atividade,
  data,
  horario,
  participantes,
}: EmailConfirmacaoPayload) {
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

  await ensureTransporterReady();

  let lastError: unknown = new Error("Email sending failed");
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await getTransporter().sendMail({
        from: `${SMTP_NAME} <${SMTP_FROM}>`,
        to: payload.email,
        subject: "Confirmacao de Reserva",
        html: buildEmailHtml(payload),
      });

      console.log(
        `[email] confirmacao enviada para ${payload.email} | tentativa ${attempt} | id: ${info.messageId}`,
      );
      return { enviado: true };
    } catch (error) {
      lastError = error;
      const message = (error as { message?: string })?.message ?? "unknown";
      const code = (error as { code?: string })?.code ?? "UNKNOWN";
      console.error(
        `[email] erro tentativa ${attempt}/${MAX_RETRIES} (${code}): ${message}`,
      );

      if (shouldRetry(error, attempt)) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }

      break;
    }
  }

  throw lastError;
}
