import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";

const AUTOMATION_CONFIG_VERSION = 3;
const TIMEZONE = "America/Sao_Paulo";
const dateKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
const reservationDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (iso) return iso[1];
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
};

export const TEMPLATE_LEMBRETE_DIA_PADRAO =
  "Bom dia, {nome}! 🌿\n\n" +
  "A Fazenda Vagafogo espera você hoje.\n\n" +
  "⏰ Horário: {horario}\n" +
  "🎫 Experiência: {atividade}\n" +
  "👥 Participantes: {participantes}\n\n" +
  "Orientações importantes:\n{instrucoes}\n\n" +
  "Desejamos uma ótima experiência!";

export const garantirConfiguracaoAutomacoesWhatsapp = async () => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection("configuracoes").doc("whatsapp");
  const snapshot = await ref.get();
  const current = snapshot.exists ? snapshot.data() ?? {} : {};
  if (Number(current.automacoesTransacionaisVersao ?? 0) >= AUTOMATION_CONFIG_VERSION) return false;
  const currentInternalMessage = String(current.mensagemAvisoNovaReservaEquipe ?? "").trim();

  await ref.set({
    // Esta migracao habilita uma unica vez as automacoes solicitadas. Depois
    // disso, o painel continua sendo a fonte de verdade e pode desliga-las.
    confirmacaoAutomaticaAtiva: true,
    avisoNovaReservaEquipeAtivo: true,
    avisoNovaReservaEquipeNumero: String(current.avisoNovaReservaEquipeNumero ?? "").replace(/\D/g, "") || "5562991150376",
    avisoNovaReservaEquipeSomenteDataDaVisita: true,
    avisoNovaReservaEquipeSomenteEntradasDoDia: FieldValue.delete(),
    resumoReservasEquipeAtivo: true,
    horarioResumoReservasEquipe: String(current.horarioResumoReservasEquipe ?? "").trim() || "07:30",
    ...(currentInternalMessage ? {
      mensagemAvisoNovaReservaEquipe: currentInternalMessage.startsWith("🌿 Nova reserva recebida")
        ? currentInternalMessage.replace("🌿 Nova reserva recebida", "🌿 Reserva para hoje")
        : currentInternalMessage,
    } : {}),
    lembreteDiaAtivo: true,
    horarioLembreteDia: "08:00",
    intervaloLembreteDiaMinSegundos: 60,
    intervaloLembreteDiaMaxSegundos: 120,
    limiteDiarioLembreteDia: 100,
    mensagemLembreteDia: String(current.mensagemLembreteDia ?? "").trim() || TEMPLATE_LEMBRETE_DIA_PADRAO,
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Mantem o historico antigo, mas a versao atual usa um unico resumo matinal.
  // Alertas individuais ficam reservados a compras feitas para o proprio dia.
  const today = dateKey();
  const alerts = await db.collection("whatsapp_notificacoes_internas").limit(200).get();
  const batch = db.batch();
  let changes = 0;
  alerts.docs.forEach((document) => {
    const data = document.data();
    const visitDate = reservationDate(data.data);
    if (!visitDate) return;
    if (data.status === "enviado" && visitDate > today) {
      batch.set(document.ref, {
        status: "agendado",
        dataEnvioProgramada: FieldValue.delete(),
        messageId: FieldValue.delete(),
        enviadoEm: FieldValue.delete(),
        motivo: "reagendado_para_data_da_visita",
        tentativas: 0,
        proximaTentativaEm: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.set(db.collection("reservas").doc(String(data.reservaId ?? document.id)), {
        whatsappAvisoEquipeEnviado: false,
        whatsappAvisoEquipeReagendadoPara: visitDate,
      }, { merge: true });
      changes += 2;
    } else if (data.status === "enviado" && visitDate === today && !data.dataEnvioProgramada) {
      batch.set(document.ref, {
        dataEnvioProgramada: today,
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      changes += 1;
    } else if (["aguardando", "enviando"].includes(String(data.status ?? "")) && visitDate > today) {
      batch.set(document.ref, {
        status: "agendado",
        motivo: "aguardando_data_da_visita",
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      changes += 1;
    }
  });
  if (changes > 0) await batch.commit();
  await ref.set({
    automacoesTransacionaisVersao: AUTOMATION_CONFIG_VERSION,
    automacoesTransacionaisMigradasEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
};

