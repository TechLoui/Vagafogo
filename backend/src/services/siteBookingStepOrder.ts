type BookingUi = {
  step?: unknown;
  draft?: {
    tipoOferta?: unknown;
    ofertaId?: unknown;
    data?: unknown;
    horario?: unknown;
    horariosPorPacote?: unknown;
  };
  [key: string]: unknown;
};

type CatalogPackage = { id: string; modoHorario: string; horarios: string[] };
type CatalogCombo = { id: string; pacoteIds: string[] };

export const requireTimeBeforeParticipants = (
  ui: BookingUi | null,
  packages: CatalogPackage[],
  combos: CatalogCombo[],
): BookingUi | null => {
  if (!ui || ui.step !== "participants") return null;
  const draft = ui.draft;
  const offerId = String(draft?.ofertaId ?? "");
  if (!offerId || !/^\d{4}-\d{2}-\d{2}$/.test(String(draft?.data ?? ""))) return null;
  const selectedIds = draft?.tipoOferta === "combo"
    ? combos.find((combo) => combo.id === offerId)?.pacoteIds ?? []
    : [offerId];
  if (!selectedIds.length) return null;
  const scheduled = packages.filter((item) => selectedIds.includes(item.id)
    && item.modoHorario !== "intervalo" && item.horarios.length > 0);
  if (!scheduled.length) return null;
  const mapped = draft?.horariosPorPacote && typeof draft.horariosPorPacote === "object" && !Array.isArray(draft.horariosPorPacote)
    ? draft.horariosPorPacote as Record<string, unknown> : {};
  const missing = scheduled.some((item) => {
    const selected = String(mapped[item.id] ?? (scheduled.length === 1 ? draft?.horario ?? "" : ""));
    return !item.horarios.includes(selected);
  });
  return missing ? { ...ui, step: "time" } : null;
};
