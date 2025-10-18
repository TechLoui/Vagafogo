"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const reservasRef = (0, firestore_1.collection)(firebase_1.db, "reservas");
const pacotesRef = (0, firestore_1.collection)(firebase_1.db, "pacotes");
app.get("/api/reservas", async (_req, res) => {
    try {
        const reservasQuery = (0, firestore_1.query)(reservasRef, (0, firestore_1.where)("status", "in", ["pago"]));
        const snapshot = await (0, firestore_1.getDocs)(reservasQuery);
        const reservas = snapshot.docs.map((registro) => ({
            id: registro.id,
            ...registro.data(),
        }));
        res.json(reservas);
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao listar reservas" });
    }
});
app.get("/api/pacotes", async (_req, res) => {
    try {
        const snapshot = await (0, firestore_1.getDocs)(pacotesRef);
        const pacotes = snapshot.docs.map((registro) => ({
            id: registro.id,
            ...registro.data(),
        }));
        res.json(pacotes);
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao listar pacotes" });
    }
});
app.post("/api/reservas", async (req, res) => {
    try {
        const novo = await (0, firestore_1.addDoc)(reservasRef, req.body);
        res.json({ id: novo.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao criar reserva" });
    }
});
app.post("/api/pacotes", async (req, res) => {
    try {
        const novo = await (0, firestore_1.addDoc)(pacotesRef, req.body);
        res.json({ id: novo.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao criar pacote" });
    }
});
app.put("/api/reservas/:id", async (req, res) => {
    try {
        const ref = (0, firestore_1.doc)(reservasRef, req.params.id);
        await (0, firestore_1.updateDoc)(ref, req.body);
        res.json({ id: req.params.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao atualizar reserva" });
    }
});
app.delete("/api/reservas/:id", async (req, res) => {
    try {
        const ref = (0, firestore_1.doc)(reservasRef, req.params.id);
        await (0, firestore_1.deleteDoc)(ref);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao remover reserva" });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
});
exports.default = app;
