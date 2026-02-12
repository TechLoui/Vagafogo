import { Router } from "express";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import {
  enviarEmailConfirmacao,
  isEmailConfirmacaoHabilitada,
} from "../services/emailService";

const router = Router();

router.post("/", async (req, res) => {
  const data = req.body;
  console.log("[webhook] recebido:", JSON.stringify(data, null, 2));

  const evento = data.event;
  const pagamento = data.payment;
  const metodo = pagamento?.billingType;
  const status = pagamento?.status;
  const externalId = pagamento?.externalReference;

  const isCartaoPago = evento === "PAYMENT_CONFIRMED" && status === "CONFIRMED";
  const isPixPago = evento === "PAYMENT_RECEIVED" && metodo === "PIX" && status === "RECEIVED";

  if (!isCartaoPago && !isPixPago) {
    console.log("[webhook] ignorado:", evento, "| status:", status, "| metodo:", metodo);
    return res.sendStatus(204);
  }

  if (!externalId) {
    console.warn("[webhook] externalReference ausente no webhook.");
    return res.status(400).send("externalReference ausente");
  }

  try {
    console.log(`[webhook] Atualizando reserva com ID: ${externalId}`);

    const reservaRef = doc(db, "reservas", externalId);
    const reservaSnap = await getDoc(reservaRef);

    if (!reservaSnap.exists()) {
      console.warn(`[webhook] Reserva ${externalId} não encontrada no Firestore`);
      return res.sendStatus(200);
    }

    await updateDoc(reservaRef, {
      status: "pago",
      dataPagamento: new Date(),
    });

    const reserva = reservaSnap.data();

    if (isEmailConfirmacaoHabilitada()) {
      try {
        const resultadoEmail = await enviarEmailConfirmacao({
          nome: reserva.nome,
          email: reserva.email,
          atividade: reserva.atividade,
          data: reserva.data,
          horario: reserva.horario,
          participantes: reserva.participantes,
        });

        if (resultadoEmail.enviado) {
          console.log(
            `[webhook] E-mail de confirmação enviado para: ${reserva.email}`,
          );
        } else {
          console.warn(
            `[webhook] E-mail ignorado (${resultadoEmail.motivo}): ${reserva.email}`,
          );
        }
      } catch (emailError) {
        console.error(
          `[webhook] Erro ao enviar e-mail para ${reserva.email}:`,
          emailError,
        );
      }
    } else {
      console.log("[webhook] Envio de e-mail desabilitado; ignorando confirmação.");
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("[webhook] Erro ao atualizar reserva:", error);
    return res.status(500).send("Erro ao processar o webhook");
  }
});

export default router;
