type TipoComIdade = {
  id?: string;
  nome: string;
  perguntarIdade?: boolean;
  idadeMinima?: number;
  idadeMaxima?: number;
};

const normalizarCategoria = (valor = '') => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ');

const faixaPadrao = (tipo: TipoComIdade) => {
  const categoria = `${normalizarCategoria(tipo.nome)} ${normalizarCategoria(tipo.id)}`;
  if (/\b(?:nao pagantes?|isent[oa]s?|bebes?)\b/.test(categoria)) return { min: 0, max: 4 };
  if (/\b(?:criancas?|infantil|infantis)\b/.test(categoria)) return { min: 5, max: 12 };
  return undefined;
};

export const tipoEhInfantil = (tipo: TipoComIdade) => faixaPadrao(tipo) !== undefined;

export const tipoExigeIdades = (tipo: TipoComIdade) => tipoEhInfantil(tipo) || tipo.perguntarIdade === true;

export function normalizarLimiteIdade(valor: unknown): number | undefined {
  if (typeof valor !== 'number' && typeof valor !== 'string') return undefined;
  if (typeof valor === 'string' && !/^\d+$/.test(valor.trim())) return undefined;
  const idade = Number(valor);
  return Number.isInteger(idade) && idade >= 0 && idade <= 120 ? idade : undefined;
}

export function limitesIdade(tipo: TipoComIdade) {
  const padrao = faixaPadrao(tipo) ?? { min: 0, max: 120 };
  return {
    min: normalizarLimiteIdade(tipo.idadeMinima) ?? padrao.min,
    max: normalizarLimiteIdade(tipo.idadeMaxima) ?? padrao.max,
  };
}

export function idadeParticipanteValida(valor: unknown, tipo: TipoComIdade) {
  const idade = normalizarLimiteIdade(valor);
  const { min, max } = limitesIdade(tipo);
  return idade !== undefined && idade >= min && idade <= max;
}
