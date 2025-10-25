import express from "express";
import cors from "cors";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase";

const app = express();
app.use(cors());
app.use(express.json());

const reservasRef = collection(db, "reservas");
const pacotesRef = collection(db, "pacotes");

app.get("/api/reservas", async (_req, res) => {
  try {
    const statusVisiveis = ["pago", "confirmado", "pre_reserva"];
    const reservasQuery = query(reservasRef, where("status", "in", statusVisiveis));
    const snapshot = await getDocs(reservasQuery);
    const reservas = snapshot.docs.map((registro) => ({
      id: registro.id,
      ...registro.data(),
    }));
    res.json(reservas);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao listar reservas" });
  }
});

app.get("/api/pacotes", async (_req, res) => {
  try {
    const snapshot = await getDocs(pacotesRef);
    const pacotes = snapshot.docs.map((registro) => ({
      id: registro.id,
      ...registro.data(),
    }));
    res.json(pacotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao listar pacotes" });
  }
});

app.post("/api/reservas", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, any>;
    const payload = {
      ...body,
      status: typeof body.status === "string" ? body.status : "pre_reserva",
    };
    const novo = await addDoc(reservasRef, payload);
    res.json({ id: novo.id, ...payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao criar reserva" });
  }
});

app.post("/api/pacotes", async (req, res) => {
  try {
    const novo = await addDoc(pacotesRef, req.body);
    res.json({ id: novo.id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao criar pacote" });
  }
});

app.put("/api/reservas/:id", async (req, res) => {
  try {
    const ref = doc(reservasRef, req.params.id);
    await updateDoc(ref, req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao atualizar reserva" });
  }
});

app.delete("/api/reservas/:id", async (req, res) => {
  try {
    const ref = doc(reservasRef, req.params.id);
    await deleteDoc(ref);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao remover reserva" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});

export default app;
