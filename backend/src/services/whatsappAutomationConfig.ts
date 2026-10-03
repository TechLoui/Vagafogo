import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";

const AUTOMATION_CONFIG_VERSION = 1;

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

  await ref.set({
    // Esta migracao habilita uma unica vez as automacoes solicitadas. Depois
    // disso, o painel continua sendo a fonte de verdade e pode desliga-las.
    confirmacaoAutomaticaAtiva: true,
    avisoNovaReservaEquipeAtivo: true,
    avisoNovaReservaEquipeNumero: String(current.avisoNovaReservaEquipeNumero ?? "").replace(/\D/g, "") || "5562991150376",
    avisoNovaReservaEquipeSomenteEntradasDoDia: true,
    lembreteDiaAtivo: true,
    horarioLembreteDia: "08:00",
    intervaloLembreteDiaMinSegundos: 60,
    intervaloLembreteDiaMaxSegundos: 120,
    limiteDiarioLembreteDia: 100,
    mensagemLembreteDia: String(current.mensagemLembreteDia ?? "").trim() || TEMPLATE_LEMBRETE_DIA_PADRAO,
    automacoesTransacionaisVersao: AUTOMATION_CONFIG_VERSION,
    automacoesTransacionaisMigradasEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
};

