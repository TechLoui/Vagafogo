const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin
let serviceAccount;
try {
  // Tentar usar variável de ambiente primeiro
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback para arquivo local (desenvolvimento)
    serviceAccount = require('./banco-vaga-fogo-firebase-adminsdk-fbsvc-497b4ae1e7.json');
  }
} catch (error) {
  console.error('Erro ao carregar credenciais Firebase:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'banco-vaga-fogo'
});

// Configurar Firestore para região southamerica-east1
const db = admin.firestore();
db.settings({
  host: 'southamerica-east1-firestore.googleapis.com',
  ssl: true
});

// GET /api/test-firebase - Testar conexão Firebase
app.get('/api/test-firebase', async (req, res) => {
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

// GET /api/reservas
app.get('/api/reservas', async (req, res) => {
  try {
    console.log('Buscando reservas no Firebase...');
    console.log('Tentando acessar coleção: reservas');
    
    const snapshot = await db.collection('reservas').get();
    console.log(`Encontradas ${snapshot.size} reservas`);
    
    if (snapshot.empty) {
      console.log('Coleção vazia, retornando array vazio');
      return res.json([]);
    }
    
    const reservas = snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data };
    });
    
    console.log('Reservas carregadas com sucesso:', reservas.length);
    res.json(reservas);
  } catch (error) {
    console.error('Erro detalhado ao buscar reservas:');
    console.error('- Mensagem:', error.message);
    console.error('- Código:', error.code);
    console.error('- Stack:', error.stack);
    
    // Fallback para dados de exemplo
    res.json([
      {
        id: 'exemplo1',
        nome: 'João Silva (Erro Firebase)',
        cpf: '123.456.789-00',
        telefone: '(62) 91234-5678',
        adultos: 2,
        criancas: 1,
        naoPagante: 0,
        bariatrica: 0,
        data: '2025-08-27',
        horario: '09:00',
        atividade: 'Brunch Gastronômico',
        valor: 150,
        status: 'pago',
        participantes: 4,
        email: 'joao@email.com',
        observacao: 'Erro de conexão'
      }
    ]);
  }
});

// GET /api/pacotes
app.get('/api/pacotes', async (req, res) => {
  try {
    console.log('Buscando pacotes no Firebase...');
    const snapshot = await db.collection('pacotes').get();
    console.log(`Encontrados ${snapshot.size} pacotes`);
    
    if (snapshot.empty) {
      console.log('Nenhum pacote encontrado, retornando array vazio');
      return res.json([]);
    }
    
    const pacotes = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Pacote ${doc.id}:`, data);
      return { id: doc.id, ...data };
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

// POST /api/reservas
app.post('/api/reservas', async (req, res) => {
  try {
    console.log('Criando nova reserva:', req.body);
    const docRef = await db.collection('reservas').add(req.body);
    console.log('Reserva criada com ID:', docRef.id);
    res.json({ id: docRef.id, ...req.body });
  } catch (error) {
    console.error('Erro ao criar reserva:', error);
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
    console.log(`Atualizando reserva ${req.params.id}:`, req.body);
    await db.collection('reservas').doc(req.params.id).update(req.body);
    console.log('Reserva atualizada com sucesso');
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error('Erro ao atualizar reserva:', error);
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
    console.log(`Deletando reserva ${req.params.id}`);
    await db.collection('reservas').doc(req.params.id).delete();
    console.log('Reserva deletada com sucesso');
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar reserva:', error);
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});

module.exports = app;