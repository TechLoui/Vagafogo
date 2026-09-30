import { Router } from "express";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { obterCamposRetencaoReservaNaAtualizacao } from "../services/reservaRetention";
import { enviarEmailConfirmacaoReserva } from "../services/emailReservas";
import { enviarConfirmacaoWhatsapp } from "../services/whatsapp";
import { registrarResultadoCampanhaReserva } from "../services/whatsappCampaigns";
import { requestAgentService } from "../services/agentGateway";
import { concluirLeadAgenteComReserva } from "../services/agentReservationTools";

type WebhookPayment = {
  id?: string;
  status?: string;
  billingType?: string;
  externalReference?: string;
};

type WebhookPayload = {
  event?: string;
  payment?: WebhookPayment | null;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_RETRIES = parseNumber(process.env.WEBHOOK_MAX_RETRIES, 3);
const RETRY_DELAY_MS = parseNumber(process.env.WEBHOOK_RETRY_DELAY_MS, 4000);

const reservaVeioDoAgente = (reserva: Record<string, any>) => {
  const attribution = reserva.atribuicao && typeof reserva.atribuicao === "object" ? reserva.atribuicao : {};
  return String(attribution.sourceChannel ?? reserva.canalOrigem ?? "").toLowerCase() === "whatsapp"
    && (String(attribution.utmMedium ?? "").toLowerCase() === "agente" || String(attribution.sessionId ?? "").startsWith("whatsapp_"));
};

const mensagemConfirmacaoAgente = (reservaId: string, reserva: Record<string, any>) => {
  const name = String(reserva.nome ?? reserva.Nome ?? "").trim().split(/\s+/)[0] || "cliente";
  const activity = String(reserva.atividade ?? reserva.Atividade ?? "experiencia Vagafogo").trim();
  const date = String(reserva.data ?? reserva.Data ?? "").trim();
  const time = String(reserva.horario ?? reserva.Horario ?? "").trim();
  return `Pagamento confirmado, ${name}! ✅\n\nSua reserva para ${activity}${date ? ` em ${date}` : ""}${time ? ` às ${time}` : ""} foi concluída com sucesso.\nCódigo da reserva: ${reservaId}\n\nGuarde esta mensagem. Esperamos você na Vagafogo!`;
};

const enviarConfirmacaoPeloAgente = async (reservaId: string, reserva: Record<string, any>) => {
  const phone = String(reserva.telefone ?? reserva.Telefone ?? "").replace(/\D/g, "").slice(0, 15);
  if (!phone) return { enviado: false, motivo: "telefone_ausente" };
  const response = await requestAgentService("gateway", "/api/whatsapp/transactional-send", {
    method: "POST",
    body: { phone, text: mensagemConfirmacaoAgente(reservaId, reserva) },
    timeoutMs: 30_000,
  });
  const body = response.body && typeof response.body === "object" ? response.body as Record<string, unknown> : {};
  return {
    enviado: response.status < 300 && body.ok === true,
    motivo: response.status < 300 ? undefined : String(body.error ?? `HTTP_${response.status}`),
    messageId: body.messageId ? String(body.messageId) : undefined,
  };
};

const router = Router();
const taskQueue: Array<{ payload: WebhookPayload; attempt: number }> = [];
let queueRunning = false;

router.post("/", (req, res) => {
  enqueueTask(req.body as WebhookPayload);
  res.status(200).send("OK");
});

function enqueueTask(payload: WebhookPayload) {
  taskQueue.push({ payload, attempt: 0 });
  console.log(
    `[webhook] Evento ${payload.event ?? "desconhecido"} recebido | fila: ${taskQueue.length}`,
  );

  if (!queueRunning) {
    queueRunning = true;
    void processQueue();
  }
}

async function processQueue() {
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (!task) {
      continue;
    }
    await processTask(task);
  }

  queueRunning = false;
}

async function processTask(task: { payload: WebhookPayload; attempt: number }) {
  while (task.attempt <= MAX_RETRIES) {
    try {
      await handleWebhook(task.payload);
      return;
    } catch (error) {
      task.attempt += 1;
      const externalId =
        task.payload?.payment?.externalReference ?? "sem-id";

      if (task.attempt > MAX_RETRIES) {
        console.error(
          `[webhook] Falha definitiva ao processar ${externalId}:`,
          error,
        );
        return;
      }

      console.warn(
        `[webhook] Tentativa ${task.attempt}/${MAX_RETRIES} para ${externalId}:`,
        error,
      );
      await delay(RETRY_DELAY_MS);
    }
  }
}

async function handleWebhook(payload: WebhookPayload) {
  const event = payload?.event;
  const payment = payload?.payment ?? undefined;

  if (!shouldProcess(event, payment)) {
    console.log(
      `[webhook] Evento ignorado (${event ?? "desconhecido"}) | status: ${
        payment?.status ?? "-"
      } | metodo: ${payment?.billingType ?? "-"}`,
    );
    return;
  }

  const externalReference = payment?.externalReference;
  if (!externalReference) {
    throw new Error("externalReference ausente no payload");
  }

  const reservaRef = doc(db, "reservas", externalReference);
  const reservaSnap = await getDoc(reservaRef);

  if (!reservaSnap.exists()) {
    console.warn(
      `[webhook] Reserva ${externalReference} nao encontrada no Firestore`,
    );
    return;
  }

  const reservaExistente = reservaSnap.data() as Record<string, any>;

  await updateDoc(reservaRef, {
    status: "pago",
    confirmada: true,
    dataPagamento: new Date(),
    ...obterCamposRetencaoReservaNaAtualizacao({
      status: "pago",
      confirmada: true,
      criadoEm: reservaExistente.criadoEm,
    }),
  });

  const reserva: Record<string, any> = {
    ...reservaExistente,
    status: "pago",
    confirmada: true,
  };

  await registrarResultadoCampanhaReserva(
    reservaExistente.atribuicao,
    externalReference,
    Number(reservaExistente.valor ?? 0),
    true,
  ).catch((error) => {
    console.error(`[crm][campanha] Falha ao atribuir pagamento ${externalReference}:`, error);
  });

  try {
    const resultadoEmail = await enviarEmailConfirmacaoReserva(
      externalReference,
      reserva,
      reservaRef,
    );
    if (resultadoEmail.enviado) {
      console.log(`[webhook] Email enviado para ${externalReference}.`);
    } else {
      console.warn(
        `[webhook] Email nao enviado para ${externalReference}: ${resultadoEmail.motivo}`,
      );
    }
  } catch (error: any) {
    await updateDoc(reservaRef, {
      emailErro: error?.message || "Erro ao enviar email",
      dataEmailErro: new Date(),
    }).catch(() => undefined);
    console.error(
      `[webhook] Erro ao enviar email para ${externalReference}:`,
      error,
    );
  }

  if (reservaVeioDoAgente(reservaExistente)) {
    await concluirLeadAgenteComReserva(
      reservaExistente.telefone ?? reservaExistente.Telefone,
      externalReference,
      payment?.id,
    ).catch((error) => console.error(`[webhook] Falha ao concluir lead do Agente ${externalReference}:`, error));
    if (!reservaExistente.whatsappAgenteConfirmacaoPagamentoEnviado) {
      const resultado = await enviarConfirmacaoPeloAgente(externalReference, reserva);
      await updateDoc(reservaRef, resultado.enviado ? {
        whatsappAgenteConfirmacaoPagamentoEnviado: true,
        whatsappAgenteConfirmacaoPagamentoEm: new Date(),
        whatsappAgenteConfirmacaoPagamentoMessageId: resultado.messageId ?? null,
      } : {
        whatsappAgenteConfirmacaoPagamentoErro: resultado.motivo ?? "erro",
        whatsappAgenteConfirmacaoPagamentoErroEm: new Date(),
      }).catch(() => undefined);
      console.log(`[webhook] Confirmacao pelo Agente ${resultado.enviado ? "enviada" : "nao enviada"} para ${externalReference}: ${resultado.motivo ?? "ok"}.`);
    }
  } else {
    // Reservas do site continuam usando o disparador transacional do Vagafogo.
    void enviarConfirmacaoWhatsapp(externalReference, reserva)
    .then(async (resultado) => {
      if (resultado.enviado) {
        await updateDoc(reservaRef, {
          whatsappConfirmacaoEnviado: true,
          dataWhatsappConfirmacao: new Date(),
          whatsappConfirmacaoMensagem: resultado.mensagem ?? "",
        }).catch(() => undefined);
        console.log(`[webhook] WhatsApp confirmacao enviado para ${externalReference}.`);
      } else if (resultado.motivo !== "desativado" && resultado.motivo !== "ja_enviado") {
        await updateDoc(reservaRef, {
          whatsappConfirmacaoErro: resultado.motivo ?? "erro",
          dataWhatsappConfirmacaoErro: new Date(),
        }).catch(() => undefined);
        console.warn(`[webhook] WhatsApp confirmacao nao enviado para ${externalReference}: ${resultado.motivo}`);
      }
    })
    .catch((error: any) => {
      console.error(`[webhook] Erro ao enviar WhatsApp confirmacao para ${externalReference}:`, error);
    });
  }

  console.log(`[webhook] Reserva ${externalReference} atualizada.`);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldProcess(event?: string, payment?: WebhookPayment | null) {
  if (!event || !payment) {
    return false;
  }

  const statusNormalizado = (payment.status ?? "").toString().toUpperCase();
  const eventNormalizado = event.toString().toUpperCase();

  const statusPago = ["CONFIRMED", "RECEIVED", "PAID"].includes(statusNormalizado);
  const eventoPago = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventNormalizado);

  return statusPago && eventoPago;
}

export default router;
