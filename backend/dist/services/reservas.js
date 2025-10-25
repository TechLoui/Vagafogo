"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarReserva = criarReserva;
const firebase_1 = require("./firebase");
const firestore_1 = require("firebase/firestore");
const uuid_1 = require("uuid");
async function criarReserva(payload) {
    const { nome, cpf, email, valor, telefone, atividade, data, adultos, bariatrica, criancas, naoPagante, horario, status = "aguardando", observacao = "", temPet, perguntasPersonalizadas, } = payload;
    const totalParticipantes = (adultos ?? 0) + (bariatrica ?? 0) + (criancas ?? 0) + (naoPagante ?? 0);
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
        participantes: totalParticipantes,
        adultos,
        bariatrica,
        criancas,
        naoPagante,
        horario,
        status,
        observacao,
        temPet,
        perguntasPersonalizadas: perguntasPersonalizadas ?? [],
        criadoEm: firestore_1.Timestamp.now(),
    });
    return reservaId;
}
