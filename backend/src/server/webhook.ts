import { Router } from 'express';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const externalId = data?.payment?.externalReference;
    
    if (externalId) {
      const reservaRef = doc(db, 'reservas', externalId);
      await updateDoc(reservaRef, { status: 'pago' });
      console.log(`✅ ${externalId} -> pago`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(200).send('OK');
  }
});


export default router;
