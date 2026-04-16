type ReservaStatusSnapshot = {
  status?: unknown;
  confirmada?: unknown;
  naoConsomeDisponibilidade?: unknown;
};

const STATUS_CONFIRMADOS = new Set([
  "pago",
  "confirmado",
  "paid",
  "confirmed",
  "approved",
  "aprovado",
  "received",
  "recebido",
]);

export const normalizarStatusReserva = (valor?: unknown) =>
  (valor ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const reservaEstaConfirmada = (reserva?: ReservaStatusSnapshot) => {
  const status = normalizarStatusReserva(reserva?.status);
  if (STATUS_CONFIRMADOS.has(status)) {
    return true;
  }
  if (status) {
    return false;
  }
  return Boolean(reserva?.confirmada);
};

export const reservaNaoConsomeDisponibilidade = (reserva?: ReservaStatusSnapshot) =>
  Boolean(reserva?.naoConsomeDisponibilidade);

export const reservaContaParaOcupacao = (reserva?: ReservaStatusSnapshot) =>
  reservaEstaConfirmada(reserva) && !reservaNaoConsomeDisponibilidade(reserva);
