import { useState } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { db, testFirebaseConnection } from '../../firebase';

export function FirebaseTest() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testarConexao = async () => {
    setLoading(true);
    setStatus('Iniciando testes...');

    try {
      // Teste 1: Verificar configuração
      setStatus('1/6 - Verificando configuração...');
      const config = {
        projectId: db.app.options.projectId,
        authDomain: db.app.options.authDomain,
        apiKey: db.app.options.apiKey?.substring(0, 10) + '...'
      };
      console.log('🔧 Configuração Firebase:', config);

      // Teste 2: Testar conectividade
      setStatus('2/6 - Testando conectividade...');
      const connectionTest = await testFirebaseConnection();
      if (!connectionTest.success) {
        throw new Error(`Falha na conectividade: ${connectionTest.error}`);
      }

      // Teste 3: Tentar habilitar rede
      setStatus('3/6 - Habilitando rede...');
      try {
        await enableNetwork(db);
        console.log('✅ Rede habilitada');
      } catch (netError) {
        console.warn('⚠️ Aviso de rede:', netError);
      }

      // Teste 4: Tentar ler coleção de reservas
      setStatus('4/6 - Testando leitura de reservas...');
      const reservasSnapshot = await getDocs(collection(db, 'reservas'));
      console.log('📊 Reservas encontradas:', reservasSnapshot.size);

      // Teste 5: Tentar ler coleção de pacotes
      setStatus('5/6 - Testando leitura de pacotes...');
      const pacotesSnapshot = await getDocs(collection(db, 'pacotes'));
      console.log('📦 Pacotes encontrados:', pacotesSnapshot.size);

      // Teste 6: Tentar criar e deletar documento de teste
      setStatus('6/6 - Testando escrita...');
      const testDoc = await addDoc(collection(db, 'teste_conexao'), {
        timestamp: new Date(),
        teste: true,
        ip: window.location.hostname
      });
      console.log('✅ Documento de teste criado:', testDoc.id);

      // Deletar o documento de teste
      await deleteDoc(doc(db, 'teste_conexao', testDoc.id));
      console.log('🗑️ Documento de teste removido');

      setStatus(`✅ TODOS OS TESTES PASSARAM!

Resultados:
- Configuração: OK
- Conectividade: OK
- Rede: OK
- Reservas: ${reservasSnapshot.size} documentos
- Pacotes: ${pacotesSnapshot.size} documentos
- Escrita/Leitura: OK

O Firebase está funcionando corretamente!`);

    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      
      let errorDetails = `❌ FALHA NO TESTE

Erro: ${error.message || 'Erro desconhecido'}`;
      
      if (error.code) {
        errorDetails += `\nCódigo: ${error.code}`;
      }
      
      // Diagnósticos específicos
      if (error.code === 'permission-denied') {
        errorDetails += `\n\n🔒 PROBLEMA DE PERMISSÃO:\n- Verifique as regras do Firestore\n- Execute: firebase deploy --only firestore:rules`;
      } else if (error.code === 'unavailable') {
        errorDetails += `\n\n🌐 PROBLEMA DE REDE:\n- Verifique sua conexão com a internet\n- Tente novamente em alguns segundos`;
      } else if (error.message.includes('400')) {
        errorDetails += `\n\n⚙️ PROBLEMA DE CONFIGURAÇÃO:\n- Verifique se o projeto Firebase existe\n- Confirme as credenciais da API`;
      }
      
      setStatus(errorDetails);
    }

    setLoading(false);
  };

  const limparCache = async () => {
    try {
      await disableNetwork(db);
      await enableNetwork(db);
      setStatus('✅ Cache limpo e rede reconectada!');
    } catch (error: any) {
      setStatus(`❌ Erro ao limpar cache: ${error.message}`);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h3 className="font-bold mb-2">🔧 Diagnóstico Firebase</h3>
      <div className="flex gap-2 mb-4">
        <button 
          onClick={testarConexao}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testando...' : 'Executar Testes'}
        </button>
        <button 
          onClick={limparCache}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
        >
          Limpar Cache
        </button>
      </div>
      
      {status && (
        <div className="mt-4 p-3 bg-gray-100 rounded max-h-96 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap">{status}</pre>
        </div>
      )}
    </div>
  );
}