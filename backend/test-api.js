const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('Usando variável de ambiente FIREBASE_SERVICE_ACCOUNT');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Credenciais carregadas:', {
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email
    });
  } else {
    console.log('Variável FIREBASE_SERVICE_ACCOUNT não encontrada');
    throw new Error('FIREBASE_SERVICE_ACCOUNT não configurada');
  }
} catch (error) {
  console.error('Erro ao carregar credenciais:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'banco-vagafogo'
});

// Usar Firestore padrão
const db = admin.firestore();
console.log('Firestore inicializado');

// GET /api/test-firebase - Testar conexão Firebase
app.get('/api/test-firebase', async (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  try {
    console.log('Testando conexão Firebase...');
    console.log('Project ID:', admin.app().options.projectId);
    console.log('Service Account Email:', admin.app().options.credential.clientEmail);
    
    // Tentar listar coleções
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    console.log('Coleções encontradas:', collectionNames);
    
    res.json({ 
      success: true, 
      projectId: admin.app().options.projectId,
      collections: collectionNames 
    });
  } catch (error) {
    console.error('Erro no teste Firebase:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reservas - apenas reservas pagas
app.get('/api/reservas', async (req, res) => {
  // Headers para evitar cache
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  try {
    const snapshot = await db.collection('reservas').where('status', '==', 'pago').get();
    console.log('🔍 Buscando reservas pagas...');
    console.log('📊 Total reservas pagas encontradas:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma reserva paga encontrada');
      return res.json([]);
    }
    
    const reservas = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📋 Reserva encontrada:', doc.id, data.nome, data.status);
      return { id: doc.id, ...data };
    });
    
    console.log('✅ Retornando', reservas.length, 'reservas para o painel');
    res.json(reservas);
  } catch (error) {
    console.error('❌ Erro ao buscar reservas:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pacotes
app.get('/api/pacotes', async (req, res) => {
  try {
    const snapshot = await db.collection('pacotes').get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const pacotes = snapshot.docs.map(doc => {
      return { id: doc.id, ...doc.data() };
    });
    
    res.json(pacotes);
  } catch (error) {
    console.error('Erro ao buscar pacotes:', error);
    // Fallback para dados de exemplo
    res.json([
      {
        id: 'exemplo1',
        nome: 'Trilha Ecológica (Exemplo)',
        tipo: 'Aventura',
        precoAdulto: 50,
        precoCrianca: 25,
        precoBariatrica: 60,
        horarios: ['08:00', '09:00', '14:00'],
        dias: [0, 1, 2, 3, 4, 5, 6],
        limite: 20
      }
    ]);
  }
});

// POST /api/reservas - apenas para admin com status pago
app.post('/api/reservas', async (req, res) => {
  try {
    const reservaData = { ...req.body, status: 'pago' };
    const docRef = await db.collection('reservas').add(reservaData);
    res.json({ id: docRef.id, ...reservaData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pacotes
app.post('/api/pacotes', async (req, res) => {
  try {
    const docRef = await db.collection('pacotes').add(req.body);
    res.json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/reservas/:id
app.put('/api/reservas/:id', async (req, res) => {
  try {
    await db.collection('reservas').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pacotes/:id
app.put('/api/pacotes/:id', async (req, res) => {
  try {
    await db.collection('pacotes').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reservas/:id
app.delete('/api/reservas/:id', async (req, res) => {
  try {
    await db.collection('reservas').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pacotes/:id
app.delete('/api/pacotes/:id', async (req, res) => {
  try {
    await db.collection('pacotes').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/atividades
app.get('/api/atividades', async (req, res) => {
  try {
    const snapshot = await db.collection('Atividades').get();
    const atividades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.json([]);
  }
});

// GET /api/dias-fechados
app.get('/api/dias-fechados', async (req, res) => {
  try {
    const snapshot = await db.collection('Dias_fechados').get();
    const dias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(dias);
  } catch (error) {
    console.error('Erro ao buscar dias fechados:', error);
    res.json([]);
  }
});

// GET /api/usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const snapshot = await db.collection('Usuario').get();
    const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.json([]);
  }
});

// GET /api/clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const snapshot = await db.collection('clientes').get();
    const clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.json([]);
  }
});

// GET /api/test - Criar dados de teste
app.get('/api/test', async (req, res) => {
  try {
    // Criar reserva de teste
    await db.collection('reservas').add({
      nome: 'João Silva',
      cpf: '123.456.789-00',
      telefone: '(11) 99999-9999',
      adultos: 2,
      criancas: 1,
      naoPagante: 0,
      bariatrica: 0,
      data: '2025-08-27',
      horario: '09:00',
      atividade: 'Trilha Ecológica',
      valor: 150,
      status: 'pago',
      temPet: false
    });
    
    // Criar pacote de teste
    await db.collection('pacotes').add({
      nome: 'Trilha Ecológica',
      tipo: 'Aventura',
      precoAdulto: 50,
      precoCrianca: 25,
      precoBariatrica: 60,
      horarios: ['08:00', '09:00', '14:00'],
      dias: [0, 1, 2, 3, 4, 5, 6],
      limite: 20
    });
    
    res.json({ success: true, message: 'Dados de teste criados!' });
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/status - Status da API
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    project: process.env.FIREBASE_SERVICE_ACCOUNT ? 'Connected' : 'No credentials'
  });
});

// POST /api/marcar-pago/:id - Marcar reserva como paga manualmente
app.post('/api/marcar-pago/:id', async (req, res) => {
  try {
    const reservaId = req.params.id;
    await db.collection('reservas').doc(reservaId).update({
      status: 'pago',
      dataPagamento: new Date(),
      atualizadoManualmente: true
    });
    res.json({ success: true, message: `Reserva ${reservaId} marcada como paga` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/todas-reservas - Ver todas as reservas (incluindo aguardando)
app.get('/api/todas-reservas', async (req, res) => {
  try {
    const snapshot = await db.collection('reservas').get();
    const reservas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Total reservas no banco:', reservas.length);
    reservas.forEach(r => console.log('Reserva:', r.id, 'Status:', r.status, 'Nome:', r.nome));
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Teste se servidor está funcionando
app.get('/test', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhook - atualizar status da reserva
app.post('/webhook', (req, res) => {
  res.status(200).send('OK');
  
  try {
    const data = req.body;
    const evento = data?.event;
    const externalId = data?.payment?.externalReference;
    
    console.log('WEBHOOK:', evento, externalId);
    
    if (externalId && (evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED')) {
      setTimeout(() => {
        db.collection('reservas').doc(externalId).update({
          status: 'pago',
          dataPagamento: new Date()
        }).then(() => {
          console.log('✅ Status atualizado:', externalId);
        }).catch(err => {
          console.log('❌ Erro:', err.message);
        });
      }, 500);
    }
  } catch (error) {
    console.log('❌ Erro webhook:', error.message);
  }
});

// Webhook GET para teste
app.get('/webhook', (req, res) => {
  res.status(200).json({ message: 'Webhook endpoint ativo', timestamp: new Date().toISOString() });
});

// Importar e adicionar a rota de cobrança
const { criarCobrancaHandler } = require('./src/services/assas.js');
require('dotenv/config');

app.post('/criar-cobranca', criarCobrancaHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log('Token Asaas carregado:', process.env.ASAAS_API_KEY ? 'SIM' : 'NÃO');
  console.log('🔗 Webhook disponível em: /webhook');
  console.log('📁 Arquivo executado: test-api.js da RAIZ');
});

module.exports = app;