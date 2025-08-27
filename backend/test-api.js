const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin com variáveis de ambiente
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "banco-vaga-fogo",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'banco-vaga-fogo'
});

const db = admin.firestore();

// GET /api/reservas
app.get('/api/reservas', async (req, res) => {
  try {
    const snapshot = await db.collection('reservas').get();
    const reservas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pacotes
app.get('/api/pacotes', async (req, res) => {
  try {
    const snapshot = await db.collection('pacotes').get();
    const pacotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(pacotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reservas
app.post('/api/reservas', async (req, res) => {
  try {
    const docRef = await db.collection('reservas').add(req.body);
    res.json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});

module.exports = app;