import express, { Router } from "express";
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

const router = Router();
router.use(cors());
router.use(express.json());

const reservasRef = collection(db, "reservas");
const pacotesRef = collection(db, "pacotes");

router.get("/reservas", async (_req, res) => {
  try {
    const statusVisiveis = [
      "pago",
      "confirmado",
      "pre_reserva",
      "aguardando",
      "pending",
      "processing",
      "processando",
    ];
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

router.get("/pacotes", async (_req, res) => {
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

router.post("/reservas", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, any>;
    const {
      numero: _numero,
      cardNumber: _cardNumber,
      num: _num,
      card: _card,
      titular: _titular,
      cardHolder: _cardHolder,
      holder: _holder,
      validade: _validade,
      expiry: _expiry,
      exp: _exp,
      validity: _validity,
      cvv: _cvv,
      cvc: _cvc,
      code: _code,
      security: _security,
      creditCard: _creditCard,
      creditCardHolderInfo: _creditCardHolderInfo,
      ...safeBody
    } = body;

    const payload = {
      ...safeBody,
      status: typeof body.status === "string" ? body.status : "pre_reserva",
    };
    const novo = await addDoc(reservasRef, payload);
    res.json({ id: novo.id, ...payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao criar reserva" });
  }
});

router.post("/pacotes", async (req, res) => {
  try {
    const novo = await addDoc(pacotesRef, req.body);
    res.json({ id: novo.id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao criar pacote" });
  }
});

router.put("/reservas/:id", async (req, res) => {
  try {
    const ref = doc(reservasRef, req.params.id);
    await updateDoc(ref, req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao atualizar reserva" });
  }
});

router.delete("/reservas/:id", async (req, res) => {
  try {
    const ref = doc(reservasRef, req.params.id);
    await deleteDoc(ref);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro ao remover reserva" });
  }
});

export default router;
