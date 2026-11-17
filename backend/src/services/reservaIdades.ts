export type TipoIdadeReserva = {
  id: string;
  nome: string;
  perguntarIdade?: unknown;
  idadeMinima?: unknown;
  idadeMaxima?: unknown;
};

type ClasseInfantil = "crianca" | "nao_pagante";
type MapaIdades = Record<string, number[]>;
type GrupoIdades = {
  nome?: string;
  participantesPorTipo: Record<string, number>;
  idadesPorTipo?: MapaIdades;
};

const textoNormalizado = (valor: string) => valor
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const classeInfantil = (tipo: Pick<TipoIdadeReserva, "id" | "nome">): ClasseInfantil | undefined => {
  const categoria = textoNormalizado(`${tipo.id} ${tipo.nome}`);
  if (/\b(?:nao pagantes?|isent[oa]s?|bebes?)\b/.test(categoria)) return "nao_pagante";
  if (/\b(?:criancas?|infantil|infantis)\b/.test(categoria)) return "crianca";
};

const idadeInteira = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 120;

const limiteConfigurado = (valor: unknown) => {
  const idade = typeof valor === "string" && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  return idadeInteira(idade) ? idade : undefined;
};

export const regraIdade = (tipo: TipoIdadeReserva) => {
  const classe = classeInfantil(tipo);
  if (!classe && tipo.perguntarIdade !== true) return undefined;
  return {
    minima: limiteConfigurado(tipo.idadeMinima) ?? (classe === "crianca" ? 5 : 0),
    maxima: limiteConfigurado(tipo.idadeMaxima) ?? (classe === "crianca" ? 12 : classe === "nao_pagante" ? 4 : 120),
  };
};

const objeto = (valor: unknown): Record<string, unknown> =>
  valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, unknown> : {};

export const mapaIdadesInteiras = (valor: unknown): MapaIdades =>
  Object.fromEntries(Object.entries(objeto(valor)).filter(([chave, idades]) =>
    chave.length > 0 && chave.length <= 160
    && !["__proto__", "prototype", "constructor"].includes(chave)
    && Array.isArray(idades) && Array.from(idades).every(idadeInteira),
  )) as MapaIdades;

const chaveDoTipo = (mapa: Record<string, unknown>, tipo: TipoIdadeReserva) => {
  if (Object.prototype.hasOwnProperty.call(mapa, tipo.id)) return tipo.id;
  if (Object.prototype.hasOwnProperty.call(mapa, tipo.nome)) return tipo.nome;
  const nomeNormalizado = textoNormalizado(tipo.nome);
  return Object.keys(mapa).find((chave) => textoNormalizado(chave) === nomeNormalizado);
};

const quantidadeDoTipo = (mapa: Record<string, number>, tipo: TipoIdadeReserva) => {
  const chave = chaveDoTipo(mapa, tipo);
  return chave ? mapa[chave] ?? 0 : 0;
};

export const validarIdadesPorTipo = (
  tipos: TipoIdadeReserva[],
  quantidades: Record<string, number>,
  idadesRecebidas: unknown,
  nomeGrupo?: string,
) => {
  const idadesValidas: [string, number[]][] = [];
  const pendencias: string[] = [];
  const idades = objeto(idadesRecebidas);
  const contexto = nomeGrupo ? ` em ${nomeGrupo}` : "";
  for (const tipo of tipos) {
    const regra = regraIdade(tipo);
    const quantidade = quantidadeDoTipo(quantidades, tipo);
    if (!regra || quantidade <= 0) continue;
    const chave = chaveDoTipo(idades, tipo);
    const recebidas = chave ? idades[chave] : undefined;
    if (!Array.isArray(recebidas) || recebidas.length !== quantidade) {
      pendencias.push(`Informe uma idade para cada participante do tipo ${tipo.nome}${contexto}.`);
    } else if (regra.minima > regra.maxima) {
      pendencias.push(`A faixa de idade do tipo ${tipo.nome}${contexto} está inválida.`);
    } else if (!Array.from(recebidas).every((idade) => idadeInteira(idade) && idade >= regra.minima && idade <= regra.maxima)) {
      pendencias.push(`Informe idades inteiras de ${regra.minima} a ${regra.maxima} anos para ${tipo.nome}${contexto}.`);
    } else {
      idadesValidas.push([tipo.id, recebidas]);
    }
  }
  return { idades: Object.fromEntries(idadesValidas), pendencias };
};

export const validarIdadesCheckout = (tiposCatalogo: TipoIdadeReserva[], dados: {
  participantesPorTipo?: Record<string, number>;
  gruposParticipacao: GrupoIdades[];
  criancas: number;
  naoPagante: number;
  idadesPorTipo?: unknown;
}) => {
  const quantidades = { ...dados.participantesPorTipo };
  const grupos = dados.gruposParticipacao;
  const tipos = [...tiposCatalogo];
  const pendencias: string[] = [];
  const chavesInformadas = new Set([
    ...Object.keys(quantidades),
    ...grupos.flatMap((grupo) => Object.keys(grupo.participantesPorTipo)),
  ]);
  for (const chave of chavesInformadas) {
    const legado = { id: chave, nome: chave };
    const classe = classeInfantil(legado);
    if (!classe || tipos.some((tipo) => chaveDoTipo({ [chave]: 0 }, tipo))) continue;
    if (tiposCatalogo.some((tipo) => classeInfantil(tipo) === classe)) {
      if (quantidades[chave] > 0 || grupos.some((grupo) => grupo.participantesPorTipo[chave] > 0)) {
        pendencias.push(`Selecione a categoria cadastrada para informar a idade de ${chave}.`);
      }
    } else tipos.push(legado);
  }
  const porClasse = (classe: ClasseInfantil, mapa: Record<string, number>) => tipos
    .filter((tipo) => classeInfantil(tipo) === classe)
    .reduce((total, tipo) => total + quantidadeDoTipo(mapa, tipo), 0);
  const legados = [
    { classe: "crianca", quantidade: dados.criancas, id: "crianca", nome: "Criança" },
    { classe: "nao_pagante", quantidade: dados.naoPagante, id: "nao_pagante", nome: "Não pagante" },
  ] as const;

  if (grupos.length) {
    pendencias.push(...grupos.flatMap((grupo) => validarIdadesPorTipo(
      tipos, grupo.participantesPorTipo, grupo.idadesPorTipo, grupo.nome,
    ).pendencias));
    for (const tipo of tipos) {
      const nosGrupos = grupos.reduce((total, grupo) => total + quantidadeDoTipo(grupo.participantesPorTipo, tipo), 0);
      if (regraIdade(tipo) && quantidadeDoTipo(quantidades, tipo) > nosGrupos) {
        pendencias.push(`Informe as idades de todos os participantes do tipo ${tipo.nome} nos grupos da reserva.`);
      }
    }
    for (const legado of legados) {
      const nosGrupos = grupos.reduce((total, grupo) => total + porClasse(legado.classe, grupo.participantesPorTipo), 0);
      if (Number(legado.quantidade) > nosGrupos) {
        pendencias.push(`Informe as idades de todos os participantes do tipo ${legado.nome} nos grupos da reserva.`);
      }
    }
    return { idades: {}, pendencias };
  }

  for (const legado of legados) {
    const total = Number(legado.quantidade) || 0;
    if (total <= porClasse(legado.classe, quantidades)) continue;
    const candidatos = tipos.filter((tipo) => classeInfantil(tipo) === legado.classe);
    if (candidatos.length > 1) {
      pendencias.push(`Selecione as categorias e informe a idade de cada participante do tipo ${legado.nome}.`);
      continue;
    }
    const tipo = candidatos[0] ?? { id: legado.id, nome: legado.nome };
    if (!candidatos.length) tipos.push(tipo);
    quantidades[tipo.id] = total;
  }
  const validacao = validarIdadesPorTipo(tipos, quantidades, dados.idadesPorTipo);
  return { ...validacao, pendencias: [...pendencias, ...validacao.pendencias] };
};
