export type TipoParticipanteResumo = { id?: string; nome: string };
export type OpcoesParticipantesReserva = { naoPaganteLegadoAdicional?: boolean };
export type ParticipanteReservaResumo = {
  key: string;
  label: string;
  inicial: string;
  quantidade: number;
};
export type ReservaParaResumo = {
  participantesPorTipo?: Record<string, unknown>;
  adultos?: unknown;
  criancas?: unknown;
  bariatrica?: unknown;
  naoPagante?: unknown;
  [campo: string]: unknown;
};

const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const normalizar = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const quantidade = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
const nomeNaoPagante = (nome: string) => /\b(?:nao pagantes?|isent[oa]s?)\b/.test(normalizar(nome));
const identificadorOpaco = (value: string) => /^[A-Za-z0-9]{20}$/.test(value)
  || /^(?=.*\d)[A-Za-z0-9]{18,}$/.test(value)
  || /^[a-f\d]{8}-[a-f\d-]{27,}$/i.test(value)
  || /^\d+$/.test(value) || /[\\/]|https?:/i.test(value);

const legados = [
  { campo: 'adultos', label: 'Adulto', prefixo: 'adult' },
  { campo: 'criancas', label: 'Criança', prefixo: 'crian' },
  { campo: 'bariatrica', label: 'Bariátrica', prefixo: 'bariat' },
] as const;

const nomeLegado = (value: string) => {
  const normalized = normalizar(value);
  if (/^(adultos?|adults?)$/.test(normalized)) return 'Adulto';
  if (/^(criancas?|children|child)$/.test(normalized)) return 'Criança';
  if (/^(bariatric[ao]s?)$/.test(normalized)) return 'Bariátrica';
  if (/^(nao ?pagantes?(?: legado)?|isentos?)$/.test(normalized)) return 'Não pagante';
  return undefined;
};

export function nomeTipoParticipante(chave: string, tipos: readonly TipoParticipanteResumo[] = []): string {
  const key = texto(chave);
  const normalized = normalizar(key);
  const tipo = tipos.find((item) => item.id === key)
    ?? tipos.find((item) => normalizar(item.nome) === normalized);
  if (tipo && texto(tipo.nome)) return texto(tipo.nome);
  const legacy = nomeLegado(key);
  if (legacy) return legacy;
  if (!key || identificadorOpaco(key)) return 'Participante';
  return key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Mirrors the Admin's category counts; the caller chooses the reservation or Brunch group. */
export function resumirParticipantesReserva(
  reserva: ReservaParaResumo,
  tipos: readonly TipoParticipanteResumo[] = [],
  opcoes: OpcoesParticipantesReserva = {},
): ParticipanteReservaResumo[] {
  const entries = Object.entries(reserva.participantesPorTipo ?? {})
    .map(([key, value]) => ({ key, quantidade: quantidade(value), label: nomeTipoParticipante(key, tipos) }))
    .filter((item) => item.quantidade > 0);
  const result: Array<Omit<ParticipanteReservaResumo, 'inicial'>> = [];
  const add = (key: string, label: string, amount: number) => {
    if (amount <= 0) return;
    const existing = result.find((item) => normalizar(item.label) === normalizar(label));
    if (existing) existing.quantidade += amount;
    else result.push({ key, label, quantidade: amount });
  };

  if (entries.length > 0) {
    const unknown = entries.filter((item) => item.label === 'Participante');
    entries.filter((item) => item.label !== 'Participante').forEach((item) => add(item.key, item.label, item.quantidade));
    const missing = legados.map((legacy) => {
      const known = entries.filter((item) => item.label !== 'Participante'
        && normalizar(item.label).startsWith(legacy.prefixo))
        .reduce((sum, item) => sum + item.quantidade, 0);
      return { ...legacy, quantidade: quantidade(reserva[legacy.campo]) - known };
    });
    const unknownTotal = unknown.reduce((sum, item) => sum + item.quantidade, 0);
    const recoverable = unknownTotal > 0 && missing.every((item) => item.quantidade >= 0)
      && missing.reduce((sum, item) => sum + item.quantidade, 0) === unknownTotal;
    if (recoverable) missing.forEach((item) => add(`legado-${item.campo}`, item.label, item.quantidade));
    else unknown.forEach((item) => add(item.key, 'Participante', item.quantidade));
  } else {
    legados.forEach((item) => add(`legado-${item.campo}`, item.label, quantidade(reserva[item.campo])));
  }
  const naoPaganteNoMapa = entries.some(({ label }) =>
    nomeNaoPagante(label) || /\bbebes?\b/.test(normalizar(label)));
  if (!naoPaganteNoMapa || opcoes.naoPaganteLegadoAdicional !== false) {
    add('nao-pagante', 'Não pagante', quantidade(reserva.naoPagante));
  }
  return result.map((item) => ({
    ...item,
    inicial: nomeNaoPagante(item.label)
      ? 'N'
      : Array.from(item.label)[0]?.toLocaleUpperCase('pt-BR') || 'P',
  }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base', numeric: true }));
}

export function contarParticipantesReserva(
  reserva: ReservaParaResumo,
  tipos: readonly TipoParticipanteResumo[] = [],
  opcoes: OpcoesParticipantesReserva = {},
): number {
  return resumirParticipantesReserva(reserva, tipos, opcoes)
    .reduce((total, participante) => total + participante.quantidade, 0);
}
