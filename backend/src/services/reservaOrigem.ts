type ReservaOrigem = Record<string, any>;

export type ClassificacaoOrigemReserva =
  | "automatizada"
  | "manual"
  | "manual_legada"
  | "desconhecida";

const normalizar = (valor: unknown) => String(valor ?? "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

const primeiroTexto = (...valores: unknown[]) => {
  for (const valor of valores) {
    const texto = normalizar(valor);
    if (texto) return texto;
  }
  return "";
};

const origemManualExplicita = (reserva: ReservaOrigem) => {
  if (
    reserva.criadaManualmente === true
    || reserva.reservaManual === true
    || reserva.inseridaManualmente === true
    || reserva.createdManually === true
    || reserva.manual === true
  ) return true;

  const origem = primeiroTexto(
    reserva.origem,
    reserva.Origem,
    reserva.origemReserva,
    reserva.tipoOrigem,
  );
  return origem === "manual"
    || origem.includes("manual")
    || origem === "balcao"
    || origem === "administrativo";
};

const temEvidenciaDeCheckout = (reserva: ReservaOrigem) => {
  const atribuicao = reserva.atribuicao && typeof reserva.atribuicao === "object"
    ? reserva.atribuicao
    : {};
  const canal = primeiroTexto(
    reserva.canalOrigem,
    reserva.sourceChannel,
    atribuicao.sourceChannel,
  );
  const dominio = primeiroTexto(
    reserva.dominioOrigem,
    reserva.sourceDomain,
    atribuicao.sourceDomain,
    atribuicao.entryDomain,
  );
  return ["site", "whatsapp", "agente", "bot"].includes(canal)
    || Boolean(dominio);
};

/**
 * Classifica a procedencia usada pelas automacoes transacionais.
 *
 * Versoes antigas do Admin usavam `origem: checkout` para representar apenas
 * que uma reserva manual havia sido paga no Asaas. Nesses registros nao existe
 * `canalOrigem`, dominio nem atribuicao do checkout. Eles devem continuar sendo
 * tratados como manuais e nunca entrar em filas automaticas.
 */
export const classificarOrigemReserva = (
  reserva: ReservaOrigem | null | undefined,
): ClassificacaoOrigemReserva => {
  if (!reserva || typeof reserva !== "object") return "desconhecida";
  if (origemManualExplicita(reserva)) return "manual";

  const origem = primeiroTexto(
    reserva.origem,
    reserva.Origem,
    reserva.origemReserva,
    reserva.tipoOrigem,
  );
  const evidenciaCheckout = temEvidenciaDeCheckout(reserva);

  if (origem === "checkout") {
    return evidenciaCheckout ? "automatizada" : "manual_legada";
  }

  if (
    origem === "agente_whatsapp"
    || origem === "site"
    || origem === "whatsapp"
    || origem === "bot"
  ) return "automatizada";

  if (!origem && evidenciaCheckout) return "automatizada";
  return "desconhecida";
};

export const reservaEhManual = (reserva: ReservaOrigem | null | undefined) => {
  const classificacao = classificarOrigemReserva(reserva);
  return classificacao === "manual" || classificacao === "manual_legada";
};

export const reservaPodeReceberDisparoAutomatico = (
  reserva: ReservaOrigem | null | undefined,
) => classificarOrigemReserva(reserva) === "automatizada";
