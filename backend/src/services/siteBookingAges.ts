import { validarParticipacaoSite } from "./agentReservationTools";
import { mapaIdadesInteiras } from "./reservaIdades";

type Draft = Record<string, unknown>;
type BookingUi = { step?: unknown; draft?: Draft; [key: string]: unknown };
const object = (value: unknown): Draft =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Draft : {};
const PARTICIPANT_STEPS = new Set(["participants", "availability", "guidance", "contact", "summary", "payment"]);

export const exigirIdadesReservaSite = async (
  uiValue: unknown,
  previousDraft?: unknown,
  validate = validarParticipacaoSite,
): Promise<{ ui: BookingUi; resposta: string } | null> => {
  const ui = object(uiValue) as BookingUi;
  if (!PARTICIPANT_STEPS.has(String(ui.step))) return null;
  const draft = { ...object(previousDraft), ...object(ui.draft) };
  const counts = object(draft.participantesPorTipo);
  const quantities = [...Object.values(counts), draft.adultos, draft.bariatrica, draft.criancas, draft.naoPagantes];
  if (!quantities.some((quantity) => typeof quantity === "number" && quantity > 0)) return null;
  const checked = await validate({
    participantesPorTipo: counts,
    idadesPorTipo: draft.idadesPorTipo,
    adultos: draft.adultos,
    bariatrica: draft.bariatrica,
    criancas: draft.criancas,
    naoPagantes: draft.naoPagantes,
    idadesCriancas: draft.idadesCriancas,
    idadesNaoPagantes: draft.idadesNaoPagantes,
  });
  if (!checked.pendencias.length) return null;
  return {
    ui: {
      ...ui,
      step: "participants",
      draft: {
        ...draft,
        participantesPorTipo: checked.participantesPorTipo,
        idadesPorTipo: mapaIdadesInteiras(draft.idadesPorTipo),
      },
    },
    resposta: checked.pendencias.join(" "),
  };
};
