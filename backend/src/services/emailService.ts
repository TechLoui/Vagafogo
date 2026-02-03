// emailService.ts
import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

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

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function enviarEmailConfirmacao({
  nome,
  email,
  atividade,
  data,
  horario,
  participantes,
}: {
  nome: string;
  email: string;
  atividade: string;
  data: string;
  horario: string;
  participantes: number;
}) {
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
