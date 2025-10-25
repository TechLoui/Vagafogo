"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
const emailService_1 = require("../services/emailService");
const parseNumber = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const MAX_RETRIES = parseNumber(process.env.WEBHOOK_MAX_RETRIES, 3);
const RETRY_DELAY_MS = parseNumber(process.env.WEBHOOK_RETRY_DELAY_MS, 4000);
const router = (0, express_1.Router)();
const taskQueue = [];
let queueRunning = false;
router.post("/", (req, res) => {
    enqueueTask(req.body);
    res.status(200).send("OK");
});
function enqueueTask(payload) {
    taskQueue.push({ payload, attempt: 0 });
    console.log(`[webhook] Evento ${payload.event ?? "desconhecido"} recebido | fila: ${taskQueue.length}`);
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
async function processTask(task) {
    while (task.attempt <= MAX_RETRIES) {
        try {
            await handleWebhook(task.payload);
            return;
        }
        catch (error) {
            task.attempt += 1;
            const externalId = task.payload?.payment?.externalReference ?? "sem-id";
            if (task.attempt > MAX_RETRIES) {
                console.error(`[webhook] Falha definitiva ao processar ${externalId}:`, error);
                return;
            }
            console.warn(`[webhook] Tentativa ${task.attempt}/${MAX_RETRIES} para ${externalId}:`, error);
            await delay(RETRY_DELAY_MS);
        }
    }
}
async function handleWebhook(payload) {
    const event = payload?.event;
    const payment = payload?.payment ?? undefined;
    if (!shouldProcess(event, payment)) {
        console.log(`[webhook] Evento ignorado (${event ?? "desconhecido"}) | status: ${payment?.status ?? "-"} | metodo: ${payment?.billingType ?? "-"}`);
        return;
    }
    const externalReference = payment?.externalReference;
    if (!externalReference) {
        throw new Error("externalReference ausente no payload");
    }
    const reservaRef = (0, firestore_1.doc)(firebase_1.db, "reservas", externalReference);
    const reservaSnap = await (0, firestore_1.getDoc)(reservaRef);
    if (!reservaSnap.exists()) {
        console.warn(`[webhook] Reserva ${externalReference} nao encontrada no Firestore`);
        return;
    }
    await (0, firestore_1.updateDoc)(reservaRef, {
        status: "pago",
        dataPagamento: new Date(),
    });
    const reserva = reservaSnap.data();
    if (!reserva.email) {
        console.warn(`[webhook] Reserva ${externalReference} sem e-mail cadastrado.`);
        return;
    }
    if (reserva.emailEnviado) {
        console.log(`[webhook] E-mail ja havia sido enviado para ${externalReference}, ignorando duplicidade.`);
        return;
    }
    await (0, emailService_1.enviarEmailConfirmacao)({
        nome: reserva.nome ?? "Cliente",
        email: reserva.email,
        atividade: reserva.atividade ?? "Atividade",
        data: reserva.data ?? "-",
        horario: reserva.horario ?? "-",
        participantes: reserva.participantes ?? 0,
    });
    await (0, firestore_1.updateDoc)(reservaRef, {
        emailEnviado: true,
        dataEmailEnviado: new Date(),
    });
    console.log(`[webhook] Reserva ${externalReference} atualizada e e-mail enviado.`);
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function shouldProcess(event, payment) {
    if (!event || !payment) {
        return false;
    }
    const status = payment.status;
    const method = payment.billingType;
    const isCardConfirmed = event === "PAYMENT_CONFIRMED" && status === "CONFIRMED";
    const isPixConfirmed = event === "PAYMENT_RECEIVED" &&
        method === "PIX" &&
        status === "RECEIVED";
    return isCardConfirmed || isPixConfirmed;
}
exports.default = router;
