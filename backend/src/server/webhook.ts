import { Router } from "express";
import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { obterCamposRetencaoReservaNaAtualizacao } from "../services/reservaRetention";
import { enviarEmailConfirmacaoReserva } from "../services/emailReservas";
import {
  enfileirarConfirmacaoReservaWhatsapp,
  processarConfirmacaoReservaWhatsapp,
} from "../services/whatsappReservationConfirmations";
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

const telefoneIdentidadeAgente = (reserva: Record<string, any>) => {
  const attribution = reserva.atribuicao && typeof reserva.atribuicao === "object" ? reserva.atribuicao : {};
  const sessionCandidates = [attribution.agentSessionId, reserva.agentSessionId];
  for (const candidate of sessionCandidates) {
    const match = /^whatsapp_(\d{10,15})$/i.exec(String(candidate ?? "").trim());
    if (match) return match[1];
  }
  return "";
};

const telefoneSessaoAgente = (reserva: Record<string, any>) => {
  const identityPhone = telefoneIdentidadeAgente(reserva);
  if (identityPhone) return identityPhone;
  return String(reserva.telefone ?? reserva.Telefone ?? "").replace(/\D/g, "").slice(0, 15);
};

const reservaVeioDoAgente = (reserva: Record<string, any>) => {
  const attribution = reserva.atribuicao && typeof reserva.atribuicao === "object" ? reserva.atribuicao : {};
  return String(attribution.sourceChannel ?? reserva.canalOrigem ?? "").toLowerCase() === "whatsapp"
    && (String(attribution.utmMedium ?? "").toLowerCase() === "agente" || Boolean(telefoneIdentidadeAgente(reserva)));
};

const formatarDataReserva = (value: unknown) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value ?? "");
};

const mensagemConfirmacaoAgente = async (reservaId: string, reserva: Record<string, any>) => {
  const name = String(reserva.nome ?? reserva.Nome ?? "").trim().split(/\s+/)[0] || "cliente";
  const activity = String(reserva.atividade ?? reserva.Atividade ?? "experiencia Vagafogo").trim();
  const date = formatarDataReserva(reserva.data ?? reserva.Data);
  const time = String(reserva.horario ?? reserva.Horario ?? "").trim();
  const packageIds = Array.from(new Set<string>([
    ...(Array.isArray(reserva.pacoteIds) ? reserva.pacoteIds.map(String) : []),
    ...(Array.isArray(reserva.gruposParticipacao)
      ? reserva.gruposParticipacao.flatMap((group: Record<string, unknown>) => Array.isArray(group.pacoteIds) ? group.pacoteIds.map(String) : [])
      : []),
  ])).slice(0, 10);
  const packageDocs = await Promise.all(packageIds.map((id) => getDoc(doc(db, "pacotes", id)).catch(() => null)));
  const packages = packageDocs.map((snapshot, index) => snapshot?.exists() ? { id: packageIds[index], ...(snapshot.data() as Record<string, unknown>) } : null).filter(Boolean) as Array<Record<string, any>>;

  const participantMap = reserva.participantesPorTipo && typeof reserva.participantesPorTipo === "object"
    ? reserva.participantesPorTipo as Record<string, unknown>
    : {};
  const ages = Array.isArray(reserva.gruposParticipacao)
    ? reserva.gruposParticipacao.reduce<Record<string, number[]>>((map, group: Record<string, any>) => {
        if (!group.idadesPorTipo || typeof group.idadesPorTipo !== "object") return map;
        Object.entries(group.idadesPorTipo).forEach(([key, values]) => {
          if (Array.isArray(values)) map[key] = values.map(Number).filter(Number.isFinite);
        });
        return map;
      }, {})
    : {};
  const typeIds = Object.keys(participantMap).slice(0, 20);
  const typeDocs = await Promise.all(typeIds.map((id) => getDoc(doc(db, "tipos_clientes", id)).catch(() => null)));
  const typeNames = Object.fromEntries(typeIds.map((id, index) => [id, typeDocs[index]?.exists() ? String(typeDocs[index]!.data()?.nome ?? id) : id]));
  const participantLines = typeIds
    .filter((id) => Number(participantMap[id]) > 0)
    .map((id) => {
      const typeAges = ages[id]?.length ? ` (${ages[id].join(", ")} anos)` : "";
      return `• ${typeNames[id]}: ${Number(participantMap[id])}${typeAges}`;
    });
  if (participantLines.length === 0) {
    if (Number(reserva.adultos) > 0) participantLines.push(`• Adultos: ${Number(reserva.adultos)}`);
    if (Number(reserva.criancas) > 0) participantLines.push(`• Crianças: ${Number(reserva.criancas)}`);
    if (Number(reserva.bariatrica) > 0) participantLines.push(`• Bariátrica: ${Number(reserva.bariatrica)}`);
    if (Number(reserva.naoPagante) > 0) participantLines.push(`• Não pagantes: ${Number(reserva.naoPagante)}`);
  }

  const details = packages.map((item) => {
    const packageName = String(item.nome ?? "Experiência").trim();
    const packageTime = String(reserva.horariosPorPacote?.[String(item.id)] ?? "").trim();
    const schedule = item.modoHorario === "intervalo"
      ? `faixa das ${String(item.horarioInicio ?? "")} às ${String(item.horarioFim ?? "")}`
      : packageTime ? `horário ${packageTime}` : "";
    return `• ${packageName}${schedule ? ` — ${schedule}` : ""}`;
  });
  const normalizedActivities = packages.map((item) => String(item.nome ?? "")).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const instructions: string[] = [];
  if (normalizedActivities.includes("brunch")) instructions.push("• Brunch: o horário reservado é o horário para estar sentado à mesa; há 15 minutos de tolerância.");
  if (normalizedActivities.includes("trilha")) {
    instructions.push("• Trilha: percurso autoguiado; entrada até 15h e saída até 16h.");
    instructions.push("• Na trilha não entram pets e não é permitido levar alimentos; água é permitida.");
  }
  packages.forEach((item) => {
    const warning = String(item.aviso ?? "").trim();
    if (warning && !instructions.some((line) => line.includes(warning))) instructions.push(`• ${String(item.nome ?? "Experiência")}: ${warning}`);
  });
  const hasBariatric = Number(reserva.bariatrica) > 0 || Object.entries(participantMap).some(([id, quantity]) => Number(quantity) > 0 && String(typeNames[id] ?? id).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("bariat"));
  if (hasBariatric) instructions.push("• Bariátrica: apresente a carteirinha na recepção no dia da visita; não é necessário enviar foto pelo WhatsApp.");
  const normalizeQuestion = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const customAnswers = Array.isArray(reserva.perguntasPersonalizadas)
    ? reserva.perguntasPersonalizadas.filter((item: unknown) => item && typeof item === "object") as Array<Record<string, any>>
    : [];
  const joinTableAnswer = customAnswers.find((item) => {
    const question = normalizeQuestion(item.pergunta);
    const answer = normalizeQuestion(item.resposta).trim();
    return question.includes("juntar") && question.includes("mesa") && (answer === "sim" || answer === "s");
  });
  if (joinTableAnswer) {
    const separateOwnerAnswer = customAnswers.find((item) => {
      const question = normalizeQuestion(item.pergunta);
      return question.includes("outra reserva") && /nome|titular|responsavel|quem/.test(question);
    });
    const conditional = joinTableAnswer.perguntaCondicional && typeof joinTableAnswer.perguntaCondicional === "object"
      ? joinTableAnswer.perguntaCondicional as Record<string, unknown>
      : {};
    const otherReservationOwner = String(separateOwnerAnswer?.resposta ?? conditional.resposta ?? "").trim().slice(0, 120);
    instructions.push(otherReservationOwner
      ? `• Mesa: solicitada acomodação com a reserva de ${otherReservationOwner}; a junção depende da organização e disponibilidade das mesas.`
      : "• Mesa: foi solicitada acomodação com outra reserva; a junção depende da organização e disponibilidade das mesas.");
  }
  const hasTablePreference = customAnswers.some((item) => {
    const question = normalizeQuestion(item.pergunta);
    const answer = normalizeQuestion(item.resposta).trim();
    return question.includes("juntar") && question.includes("mesa")
      && ["sim", "s", "nao", "n"].includes(answer);
  });
  const postConfirmationQuestion = !hasTablePreference
    ? [
        "Para organizarmos sua chegada, falta apenas uma preferência opcional:",
        "",
        "Você quer sentar junto com alguém que fez outra reserva e outro pagamento? Se sim, informe o nome do titular da outra reserva.",
        "",
        "Isso é diferente de apenas aceitar dividir uma mesa grande ou redonda com outros visitantes — nesse caso, pode responder “não”.",
      ]
    : typeof reserva.whatsappMarketingOptIn !== "boolean"
      ? ["Agora que sua reserva está confirmada: você aceita receber campanhas e novidades da Fazenda Vagafogo pelo WhatsApp?"]
      : [];

  return [
    `Pagamento confirmado, ${name}! ✅`,
    "",
    `Sua reserva foi concluída com sucesso.`,
    "A confirmação foi automática; não é necessário enviar comprovante.",
    `Código: ${reservaId}`,
    `Data: ${date || "—"}`,
    ...(details.length ? ["", reserva.comboId ? `Combo: ${activity}` : `Experiência: ${activity}`, ...details] : [`Experiência: ${activity}${time ? ` às ${time}` : ""}`]),
    ...(participantLines.length ? ["", "Participantes:", ...participantLines] : []),
    ...(instructions.length ? ["", "Orientações importantes:", ...instructions] : []),
    "",
    "🚗 Durante o trajeto, fique atento às placas indicando a estrada de acesso à Fazenda Vagafogo.",
    "📍 https://maps.google.com/?q=-15.824453,-48.995220",
    "",
    "Consulte sua reserva em:",
    "https://vagafogo.com.br/minha-reserva",
    "",
    "Esperamos você na Vagafogo! 🌿",
    ...(postConfirmationQuestion.length ? ["", ...postConfirmationQuestion] : []),
  ].join("\n").slice(0, 4096);
};

const enviarConfirmacaoPeloAgente = async (reservaId: string, reserva: Record<string, any>, requestSuffix = "") => {
  const phone = telefoneSessaoAgente(reserva);
  if (!phone) return { enviado: false, motivo: "telefone_ausente" };
  const response = await requestAgentService("gateway", "/api/whatsapp/transactional-send", {
    method: "POST",
    body: {
      phone,
      text: await mensagemConfirmacaoAgente(reservaId, reserva),
      requestId: `reserva-confirmada:${reservaId}:${phone}${requestSuffix}`,
      contactName: String(reserva.nome ?? reserva.Nome ?? "").trim().slice(0, 120),
    },
    timeoutMs: 30_000,
  });
  const body = response.body && typeof response.body === "object" ? response.body as Record<string, unknown> : {};
  return {
    enviado: response.status < 300 && body.ok === true,
    motivo: response.status < 300 ? undefined : String(body.error ?? `HTTP_${response.status}`),
    messageId: body.messageId ? String(body.messageId) : undefined,
  };
};

const confirmationRetryDelays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
const timestampMillis = (value: any) => {
  if (typeof value?.toMillis === "function") return Number(value.toMillis());
  if (typeof value?.toDate === "function") return Number(value.toDate().getTime());
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const processarConfirmacaoReservaAgente = async (reservaId: string, force = false) => {
  const reservaRef = doc(db, "reservas", reservaId);
  const snapshot = await getDoc(reservaRef);
  if (!snapshot.exists()) return { enviado: false, motivo: "reserva_nao_encontrada" };
  const reserva = snapshot.data() as Record<string, any>;
  if (!reservaVeioDoAgente(reserva) || reserva.status !== "pago" || reserva.confirmada !== true) {
    await updateDoc(reservaRef, { whatsappAgenteConfirmacaoPagamentoPendente: false }).catch(() => undefined);
    return { enviado: false, motivo: "reserva_nao_elegivel" };
  }
  const phone = telefoneSessaoAgente(reserva);
  if (!phone) return { enviado: false, motivo: "telefone_ausente" };
  if (!force && reserva.whatsappAgenteConfirmacaoPagamentoEnviado === true
    && String(reserva.whatsappAgenteConfirmacaoPagamentoTelefone ?? "") === phone) {
    await updateDoc(reservaRef, { whatsappAgenteConfirmacaoPagamentoPendente: false }).catch(() => undefined);
    return { enviado: false, motivo: "ja_enviado" };
  }
  const nextAttemptAt = timestampMillis(reserva.whatsappAgenteConfirmacaoPagamentoProximaTentativaEm);
  if (!force && nextAttemptAt > Date.now()) return { enviado: false, motivo: "aguardando_nova_tentativa" };

  const attempts = Math.max(0, Number(reserva.whatsappAgenteConfirmacaoPagamentoTentativas ?? 0));
  const resultado = await enviarConfirmacaoPeloAgente(reservaId, reserva, force ? `:manual:${Date.now()}` : "");
  if (resultado.enviado) {
    await updateDoc(reservaRef, {
      whatsappAgenteConfirmacaoPagamentoEnviado: true,
      whatsappAgenteConfirmacaoPagamentoEm: new Date(),
      whatsappAgenteConfirmacaoPagamentoTelefone: phone,
      whatsappAgenteConfirmacaoPagamentoMessageId: resultado.messageId ?? null,
      whatsappAgenteConfirmacaoPagamentoPendente: false,
      whatsappAgenteConfirmacaoPagamentoErro: null,
      whatsappAgenteConfirmacaoPagamentoErroEm: null,
      whatsappAgenteConfirmacaoPagamentoProximaTentativaEm: null,
      whatsappAgenteConfirmacaoPagamentoTentativas: attempts + 1,
    });
    return resultado;
  }

  const blocked = resultado.motivo === "CONTACT_BLOCKED";
  const retryDelay = confirmationRetryDelays[Math.min(attempts, confirmationRetryDelays.length - 1)];
  await updateDoc(reservaRef, {
    whatsappAgenteConfirmacaoPagamentoPendente: !blocked,
    whatsappAgenteConfirmacaoPagamentoTelefone: phone,
    whatsappAgenteConfirmacaoPagamentoErro: resultado.motivo ?? "erro",
    whatsappAgenteConfirmacaoPagamentoErroEm: new Date(),
    whatsappAgenteConfirmacaoPagamentoProximaTentativaEm: blocked ? null : new Date(Date.now() + retryDelay),
    whatsappAgenteConfirmacaoPagamentoTentativas: attempts + 1,
  });
  return resultado;
};

let confirmationProcessorStarted = false;
let confirmationProcessorRunning = false;
export const iniciarProcessadorConfirmacoesReservaAgente = () => {
  if (confirmationProcessorStarted) return;
  confirmationProcessorStarted = true;
  const run = async () => {
    if (confirmationProcessorRunning) return;
    confirmationProcessorRunning = true;
    try {
      const snapshot = await getDocs(query(
        collection(db, "reservas"),
        where("whatsappAgenteConfirmacaoPagamentoPendente", "==", true),
        limit(10),
      ));
      for (const reservation of snapshot.docs) {
        await processarConfirmacaoReservaAgente(reservation.id).catch((error) => {
          console.error(`[webhook] Falha ao reprocessar confirmacao ${reservation.id}:`, error);
        });
      }
    } catch (error) {
      console.error("[webhook] Falha no processador de confirmacoes do Agente:", error);
    } finally {
      confirmationProcessorRunning = false;
    }
  };
  setTimeout(() => void run(), 20_000).unref();
  setInterval(() => void run(), 60_000).unref();
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
      telefoneSessaoAgente(reservaExistente),
      externalReference,
      payment?.id,
      [reservaExistente.telefone, reservaExistente.Telefone],
    ).catch((error) => console.error(`[webhook] Falha ao concluir lead do Agente ${externalReference}:`, error));
    await updateDoc(reservaRef, {
      whatsappAgenteConfirmacaoPagamentoPendente: true,
    }).catch(() => undefined);
    const resultado = await processarConfirmacaoReservaAgente(externalReference);
    console.log(`[webhook] Confirmacao pelo Agente ${resultado.enviado ? "enviada" : "nao enviada"} para ${externalReference}: ${resultado.motivo ?? "ok"}.`);
  } else {
    // Reservas pagas no checkout do site entram em uma fila persistente. Se o
    // WhatsApp Web estiver reconectando, o worker tenta novamente sem duplicar.
    await enfileirarConfirmacaoReservaWhatsapp(externalReference).catch((error) => {
      console.error(`[webhook] Erro ao enfileirar WhatsApp confirmacao para ${externalReference}:`, error);
    });
    void processarConfirmacaoReservaWhatsapp(externalReference).then((resultado) => {
      console.log(`[webhook] Confirmacao do site ${resultado.enviado ? "enviada" : "aguardando"} para ${externalReference}: ${resultado.motivo ?? "ok"}.`);
    }).catch((error) => {
      console.error(`[webhook] Erro ao processar WhatsApp confirmacao para ${externalReference}:`, error);
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
