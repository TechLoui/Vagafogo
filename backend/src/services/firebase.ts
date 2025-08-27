// Usar Admin SDK no backend
import admin from 'firebase-admin';

// Inicializar Admin SDK se ainda não foi inicializado
if (!admin.apps.length) {
  const serviceAccount = require('../../banco-vaga-fogo-firebase-adminsdk-fbsvc-8bef52c2d8.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'banco-vaga-fogo'
  });
}

// Instância do Firestore Admin
export const db = admin.firestore();
export { admin };
