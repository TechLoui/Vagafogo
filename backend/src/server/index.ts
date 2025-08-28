import express from "express";
import cors from "cors";
import { criarCobrancaHandler } from "../services/assas";
import { db } from '../services/firebase';
import "dotenv/config";
import webhookRouter from "./webhook";

const app = express();

// Permitir requisições do localhost:5173 (seu front-end)
app.use(cors());

app.use(express.json());

app.post("/criar-cobranca", criarCobrancaHandler);
app.use('/webhook', webhookRouter);

// GET /api/reservas - apenas reservas pagas
app.get('/api/reservas', async (req, res) => {
  try {
    const snapshot = await db.collection('reservas').where('status', 'in', ['pago']).get();
    const reservas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(reservas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pacotes
app.get('/api/pacotes', async (req, res) => {
  try {
    const snapshot = await db.collection('pacotes').get();
    const pacotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(pacotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reservas - APENAS para admin com status pago
app.post('/api/reservas', async (req, res) => {
  try {
    const reservaData = { ...req.body, status: 'pago' };
    const docRef = await db.collection('reservas').add(reservaData);
    res.json({ id: docRef.id, ...reservaData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pacotes
app.post('/api/pacotes', async (req, res) => {
  try {
    const docRef = await db.collection('pacotes').add(req.body);
    res.json({ id: docRef.id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/reservas/:id
app.put('/api/reservas/:id', async (req, res) => {
  try {
    await db.collection('reservas').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reservas/:id
app.delete('/api/reservas/:id', async (req, res) => {
  try {
    await db.collection('reservas').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log("Token carregado:", process.env.ASAAS_API_KEY);

});

