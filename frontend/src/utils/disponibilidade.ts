export type DisponibilidadeHorarios = Record<string, boolean>;

export type DisponibilidadeVagasExtras = Record<string, number>;

const PREFIXO_VAGAS_EXTRAS_GERAIS = 'geral::';

const collatorNumerico = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

const normalizarQuantidade = (valor: unknown) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  return Math.max(Math.trunc(numero), 0);
};

export const compararTextoNumericamente = (a: string, b: string) =>
  collatorNumerico.compare(a, b);

export const compararHorariosComIndefinidosNoFim = (a: string, b: string) => {
  const aIndefinido = a.toLowerCase().includes('especificado');
  const bIndefinido = b.toLowerCase().includes('especificado');

  if (aIndefinido && !bIndefinido) return 1;
  if (!aIndefinido && bIndefinido) return -1;

  return compararTextoNumericamente(a, b);
};

export const normalizarBloqueiosDisponibilidade = (
  mapa?: Record<string, unknown> | null
): DisponibilidadeHorarios =>
  Object.entries(mapa ?? {}).reduce<DisponibilidadeHorarios>((acc, [chave, valor]) => {
    if (valor === false) {
      acc[chave] = false;
    }
    return acc;
  }, {});

export const normalizarVagasExtrasDisponibilidade = (
  mapa?: Record<string, unknown> | null
): DisponibilidadeVagasExtras =>
  Object.entries(mapa ?? {}).reduce<DisponibilidadeVagasExtras>((acc, [chave, valor]) => {
    const quantidade = normalizarQuantidade(valor);
    if (quantidade > 0) {
      acc[chave] = quantidade;
    }
    return acc;
  }, {});

export const montarChaveVagasExtrasDia = (dataStr: string, pacoteId: string) =>
  `${dataStr}-${pacoteId}`;

export const montarChaveVagasExtrasDiaGeral = (dataStr: string) =>
  `${PREFIXO_VAGAS_EXTRAS_GERAIS}${dataStr}`;

export const montarChaveVagasExtrasHorario = (
  dataStr: string,
  pacoteId: string,
  horario: string
) => `${dataStr}-${pacoteId}-${horario}`;

export const montarChaveVagasExtrasHorarioGeral = (dataStr: string, horario: string) =>
  `${PREFIXO_VAGAS_EXTRAS_GERAIS}${dataStr}::${horario}`;

export const obterVagasExtrasDisponibilidade = ({
  dataStr,
  pacoteId,
  horario,
  vagasExtras,
}: {
  dataStr: string;
  pacoteId?: string;
  horario?: string | null;
  vagasExtras?: DisponibilidadeVagasExtras | null;
}) => {
  if (!dataStr) return 0;

  const extrasDiaGeral = normalizarQuantidade(
    vagasExtras?.[montarChaveVagasExtrasDiaGeral(dataStr)]
  );
  const extrasHorarioGeral =
    horario && horario.trim()
      ? normalizarQuantidade(
          vagasExtras?.[montarChaveVagasExtrasHorarioGeral(dataStr, horario.trim())]
        )
      : 0;

  const extrasDia =
    pacoteId
      ? normalizarQuantidade(vagasExtras?.[montarChaveVagasExtrasDia(dataStr, pacoteId)])
      : 0;
  const extrasHorario =
    pacoteId && horario && horario.trim()
      ? normalizarQuantidade(
          vagasExtras?.[montarChaveVagasExtrasHorario(dataStr, pacoteId, horario.trim())]
        )
      : 0;

  return extrasDiaGeral + extrasHorarioGeral + extrasDia + extrasHorario;
};
