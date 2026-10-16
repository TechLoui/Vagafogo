import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { classificarDataDisparo } from "./whatsappDispatchDate";
import { enviarBoasVindasWhatsapp, type ResultadoEnvio } from "./whatsapp";

let running = false;
let timer: NodeJS.Timeout | null = null;

const millis = (value: any) => typeof value?.toMillis === "function" ? value.toMillis() : 0;

export const processarAgradecimentosPendentes = async () => {
  if (running) return;
  const db = obterFirestoreAdmin();
  if (!db) return;
  running = true;
  try {
    const snapshot = await db.collection("reservas").where("whatsappBoasVindasPendente", "==", true).limit(20).get();
    const due = snapshot.docs.find((document) => millis(document.data().whatsappBoasVindasProximaTentativaEm) <= Date.now());
    for (const document of due ? [due] : []) {
      const acquired = await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(document.ref);
        const data = fresh.data();
        if (!data || data.whatsappBoasVindasPendente !== true) return null;
        if (millis(data.whatsappBoasVindasProximaTentativaEm) > Date.now()) return null;
        if (data.whatsappBoasVindasStatus === "enviando" && millis(data.whatsappBoasVindasUltimaTentativaEm) > Date.now() - 120_000) return null;
        if (data.whatsappBoasVindasEnviado === true || data.chegou !== true || classificarDataDisparo(data.data ?? data.Data) !== "valido") {
          transaction.set(document.ref, { whatsappBoasVindasPendente: false, whatsappBoasVindasStatus: "ignorado" }, { merge: true });
          return null;
        }
        const attempts = Number(data.whatsappBoasVindasTentativas ?? 0) + 1;
        transaction.set(document.ref, {
          whatsappBoasVindasStatus: "enviando",
          whatsappBoasVindasTentativas: attempts,
          whatsappBoasVindasUltimaTentativaEm: FieldValue.serverTimestamp(),
        }, { merge: true });
        return { data, attempts };
      });
      if (!acquired) continue;
      const result: ResultadoEnvio = await enviarBoasVindasWhatsapp(document.id, acquired.data).catch((error): ResultadoEnvio => ({
        enviado: false,
        motivo: error instanceof Error ? error.message : String(error),
      }));
      if (result.enviado) {
        await document.ref.set({
          whatsappBoasVindasPendente: false,
          whatsappBoasVindasEnviado: true,
          whatsappBoasVindasStatus: "enviado",
          whatsappBoasVindasMensagem: result.mensagem ?? "",
          dataWhatsappBoasVindas: FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        const paced = result.motivo === "DISPATCH_PACED";
        const finalFailure = !paced && acquired.attempts >= 5;
        await document.ref.set({
          whatsappBoasVindasPendente: !finalFailure,
          whatsappBoasVindasStatus: finalFailure ? "erro" : "aguardando",
          whatsappBoasVindasTentativas: paced ? acquired.attempts - 1 : acquired.attempts,
          whatsappBoasVindasErro: result.motivo ?? "erro_envio",
          whatsappBoasVindasProximaTentativaEm: Timestamp.fromMillis(Date.now() + Math.max(1000, result.retryAfterMs ?? 5 * 60_000)),
        }, { merge: true });
      }
    }
  } finally {
    running = false;
  }
};

export const iniciarProcessadorAgradecimentosPendentes = () => {
  if (timer) return;
  timer = setInterval(() => void processarAgradecimentosPendentes().catch((error) => console.error("[whatsapp][agradecimento]", error)), 30_000);
  timer.unref?.();
  void processarAgradecimentosPendentes().catch((error) => console.error("[whatsapp][agradecimento]", error));
};
