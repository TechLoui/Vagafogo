"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarReserva = criarReserva;
const firebase_1 = require("./firebase");
const firestore_1 = require("firebase/firestore");
const uuid_1 = require("uuid");
const normalizarNumero = (valor) => {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.max(numero, 0) : 0;
};
const somarMapa = (mapa) => {
    if (!mapa)
        return 0;
    return Object.values(mapa).reduce((total, valor) => total + normalizarNumero(valor), 0);
};
const normalizarMapa = (mapa) => {
    if (!mapa)
        return undefined;
    return Object.fromEntries(Object.entries(mapa).map(([chave, valor]) => [chave, normalizarNumero(valor)]));
};
async function criarReserva(payload) {
    const { nome, cpf, email, valor, telefone, atividade, data, adultos, bariatrica, criancas, naoPagante, participantes, participantesPorTipo, pacoteIds, comboId, horario, status = "aguardando", observacao = "", temPet, perguntasPersonalizadas, } = payload;
    const participantesPorTipoNormalizado = normalizarMapa(participantesPorTipo);
    const mapaAtivo = participantesPorTipoNormalizado &&
        Object.keys(participantesPorTipoNormalizado).length > 0;
    const participantesCalculadosBase = mapaAtivo
        ? somarMapa(participantesPorTipoNormalizado)
        : (adultos ?? 0) + (bariatrica ?? 0) + (criancas ?? 0);
    const participantesCalculados = participantesCalculadosBase + (naoPagante ?? 0);
    const participantesConsiderados = Math.max(participantesCalculados, Number.isFinite(participantes) ? participantes : 0);
    const pacoteIdsNormalizados = Array.isArray(pacoteIds)
        ? pacoteIds
            .map((id) => id?.toString())
            .filter((id) => Boolean(id))
        : [];
    const comboIdNormalizado = comboId ? comboId.toString() : null;
    const reservaId = (0, uuid_1.v4)();
    const reservaRef = (0, firestore_1.doc)(firebase_1.db, "reservas", reservaId);
    await (0, firestore_1.setDoc)(reservaRef, {
        nome,
        cpf,
        email,
        valor,
        telefone,
        atividade,
        data,
        participantes: participantesConsiderados,
        adultos,
        bariatrica,
        criancas,
        naoPagante,
        ...(mapaAtivo ? { participantesPorTipo: participantesPorTipoNormalizado } : {}),
        ...(pacoteIdsNormalizados.length > 0 ? { pacoteIds: pacoteIdsNormalizados } : {}),
        ...(comboIdNormalizado ? { comboId: comboIdNormalizado } : {}),
        horario,
        status,
        observacao,
        temPet,
        perguntasPersonalizadas: perguntasPersonalizadas ?? [],
        criadoEm: firestore_1.Timestamp.now(),
    });
    return reservaId;
}
