export type TipoParticipanteResumo = { id?: string; nome: string };
export type ParticipanteReservaResumo = {
  key: string;
  label: string;
  inicial: string;
  quantidade: number;
};
export type AtividadeReservaResumo = { id?: string; nome: string; pacoteIds?: string[] };
export type ReservaParaResumo = {
  participantesPorTipo?: Record<string, unknown>;
  adultos?: unknown;
  criancas?: unknown;
  bariatrica?: unknown;
  naoPagante?: unknown;
  atividade?: unknown;
  pacoteNomes?: unknown;
  pacotes?: unknown;
  pacoteIds?: unknown;
  pacote?: unknown;
  pacoteNome?: unknown;
  comboId?: unknown;
  comboNome?: unknown;
  gruposParticipacao?: Array<{
    tipo?: string;
    refId?: string;
    nome?: string;
    pacoteIds?: string[];
    participantesPorTipo?: Record<string, unknown>;
    participantes?: unknown;
  }>;
};

const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const normalizar = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const quantidade = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
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
  if (/^(nao pagantes?|isentos?)$/.test(normalized)) return 'Não pagante';
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

export function resumirParticipantesReserva(
  reserva: ReservaParaResumo,
  tipos: readonly TipoParticipanteResumo[] = [],
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
  add('nao-pagante', 'Não pagante', quantidade(reserva.naoPagante));
  return result.map((item) => ({ ...item, inicial: Array.from(item.label)[0]?.toLocaleUpperCase('pt-BR') || 'P' }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base', numeric: true }));
}

const limparNomeAtividade = (value: unknown) => texto(value)
  .replace(/\s*\(Combo:[^)]*\)/gi, '')
  .replace(/^\s*(?:combo|pacote)(?:\s*:\s*|\s+)/i, '')
  .replace(/\s+-\s+(?:valor especial|R\$|\d+(?:[.,]\d+)?\s*%|pre[çc]o|desconto).*$/i, '')
  .trim().replace(/^(?:combo|pacote)$/i, '');

export function nomesAtividadesReserva(
  reserva: ReservaParaResumo,
  pacotes: readonly AtividadeReservaResumo[] = [],
  combos: readonly AtividadeReservaResumo[] = [],
): string[] {
  const distinct = (names: string[]) => Array.from(new Map(names.filter(Boolean)
    .map((name) => [normalizar(name), name])).values());
  const namesFrom = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return distinct(value.flatMap((item) => {
      const raw = typeof item === 'string' ? item : texto(item?.nome);
      const official = pacotes.find((p) => p.id === raw)?.nome;
      const name = limparNomeAtividade(official || raw);
      return name && !identificadorOpaco(name) ? [name] : [];
    }));
  };
  const namesByIds = (ids: unknown): string[] => Array.isArray(ids)
    ? distinct(ids.map((id) => limparNomeAtividade(pacotes.find((p) => p.id === id)?.nome))) : [];
  const historical = namesFrom(reserva.pacoteNomes);
  if (historical.length > 0) return historical;
  const packages = namesFrom(reserva.pacotes);
  if (packages.length > 0) return packages;
  const selected = namesByIds(reserva.pacoteIds);
  const allIdsKnown = (ids: unknown) => Array.isArray(ids) && ids.length > 0
    && ids.every((id) => pacotes.some((p) => p.id === id && texto(p.nome)));
  if (selected.length > 0 && allIdsKnown(reserva.pacoteIds)) return selected;
  const groups = distinct((reserva.gruposParticipacao ?? []).flatMap((group) => {
    const byIds = namesByIds(group.pacoteIds);
    if (byIds.length > 0 && allIdsKnown(group.pacoteIds)) return byIds;
    const source = group.tipo === 'combo' ? combos : pacotes;
    const groupName = limparNomeAtividade(source.find((item) => item.id === group.refId)?.nome || group.nome);
    return groupName && !identificadorOpaco(groupName) ? [groupName] : byIds;
  }));
  if (groups.length > 0) return groups;
  const combo = combos.find((item) => item.id === reserva.comboId);
  const comboPackages = namesByIds(combo?.pacoteIds);
  if (comboPackages.length > 0) return comboPackages;
  for (const value of [reserva.pacoteNome, reserva.pacote, reserva.atividade, combo?.nome, reserva.comboNome]) {
    const name = limparNomeAtividade(value);
    const names = distinct(name.split(/\s*\+\s*/).filter((item) => item && !identificadorOpaco(item)));
    if (names.length > 0) return names;
  }
  return selected;
}

export function rotuloAtividadeReserva(
  reserva: ReservaParaResumo,
  pacotes: readonly AtividadeReservaResumo[] = [],
  combos: readonly AtividadeReservaResumo[] = [],
): string {
  const labels = nomesAtividadesReserva(reserva, pacotes, combos)
    .flatMap((name) => name.split(/\s*\+\s*/))
    .map((name) => {
      const normalized = normalizar(name);
      if (/^brunch(?: gastronomico)?$/.test(normalized)) return 'Brunch';
      if (/^trilha(?: ecologica)?$/.test(normalized)) return 'Trilha';
      return name;
    });
  return Array.from(new Map(labels.map((name) => [normalizar(name), name])).values()).join(' + ');
}
