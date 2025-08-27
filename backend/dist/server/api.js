"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const firebase_1 = require("../services/firebase");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// GET /api/reservas
app.get('/api/reservas', async (req, res) => {
    try {
        const snapshot = await firebase_1.db.collection('reservas').get();
        const reservas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(reservas);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/pacotes
app.get('/api/pacotes', async (req, res) => {
    try {
        const snapshot = await firebase_1.db.collection('pacotes').get();
        const pacotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(pacotes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/reservas
app.post('/api/reservas', async (req, res) => {
    try {
        const docRef = await firebase_1.db.collection('reservas').add(req.body);
        res.json({ id: docRef.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/pacotes
app.post('/api/pacotes', async (req, res) => {
    try {
        const docRef = await firebase_1.db.collection('pacotes').add(req.body);
        res.json({ id: docRef.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/reservas/:id
app.put('/api/reservas/:id', async (req, res) => {
    try {
        await firebase_1.db.collection('reservas').doc(req.params.id).update(req.body);
        res.json({ id: req.params.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/reservas/:id
app.delete('/api/reservas/:id', async (req, res) => {
    try {
        await firebase_1.db.collection('reservas').doc(req.params.id).delete();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta ${PORT}`);
});
exports.default = app;
