import { useState, useEffect } from 'react';
import { enableNetwork } from 'firebase/firestore';
import { db } from '../../firebase';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkFirebaseConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setFirebaseStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar conexão inicial
    checkFirebaseConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkFirebaseConnection = async () => {
    setFirebaseStatus('checking');
    try {
      await enableNetwork(db);
      setFirebaseStatus('connected');
    } catch (error) {
      console.error('Erro de conexão Firebase:', error);
      setFirebaseStatus('disconnected');
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (firebaseStatus === 'connected') return 'bg-green-500';
    if (firebaseStatus === 'checking') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Sem internet';
    if (firebaseStatus === 'connected') return 'Firebase conectado';
    if (firebaseStatus === 'checking') return 'Verificando...';
    return 'Firebase desconectado';
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-lg border">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium">{getStatusText()}</span>
        {firebaseStatus === 'disconnected' && (
          <button
            onClick={checkFirebaseConnection}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Reconectar
          </button>
        )}
      </div>
    </div>
  );
}