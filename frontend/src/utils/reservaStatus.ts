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

const STATUS_PRE_RESERVA = new Set([
  "pre_reserva",
  "pre-reserva",
  "pre reserva",
]);

const STATUS_AGUARDANDO_PAGAMENTO = new Set([
  "aguardando",
  "aguardando_pagamento",
  "aguardando pagamento",
  "pending",
  "processing",
  "processando",
  "em_analise",
  "em analise",
  "em_processamento",
  "em processamento",
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

export const reservaEhPreReserva = (reserva?: ReservaStatusSnapshot) => {
  if (reservaEstaConfirmada(reserva)) {
    return false;
  }
  const status = normalizarStatusReserva(reserva?.status);
  return STATUS_PRE_RESERVA.has(status);
};

export const reservaEhAguardandoPagamento = (reserva?: ReservaStatusSnapshot) => {
  if (reservaEstaConfirmada(reserva)) {
    return false;
  }
  const status = normalizarStatusReserva(reserva?.status);
  return STATUS_AGUARDANDO_PAGAMENTO.has(status);
};

export const reservaEhPendente = (reserva?: ReservaStatusSnapshot) =>
  reservaEhPreReserva(reserva) || reservaEhAguardandoPagamento(reserva);

export const reservaEhAtivaNoPainel = (reserva?: ReservaStatusSnapshot) =>
  reservaEstaConfirmada(reserva) || reservaEhPreReserva(reserva);
