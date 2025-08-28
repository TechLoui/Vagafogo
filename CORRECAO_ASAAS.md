# Correção do Problema de Cobrança Asaas

## Problema Identificado
O erro 404 na rota `/criar-cobranca` ocorria porque:

1. O servidor estava executando `test-api.js` que não tinha a rota `/criar-cobranca`
2. A rota estava definida apenas em `src/server/index.ts` (TypeScript)
3. Faltavam dependências e configurações

## Correções Aplicadas

### 1. Adicionada a rota no test-api.js
- Importado o handler `criarCobrancaHandler`
- Adicionada a rota `POST /criar-cobranca`

### 2. Criado serviço Asaas em JavaScript
- Arquivo: `src/services/assas.js`
- Convertido de TypeScript para JavaScript
- Compatível com o test-api.js

### 3. Configuração de ambiente
- Criado arquivo `.env` com variáveis necessárias
- Adicionada dependência `node-fetch`

## Próximos Passos

### 1. Instalar Dependências
```bash
cd backend
npm install
```
Ou execute: `install-deps.bat`

### 2. Configurar Variáveis de Ambiente
Edite o arquivo `.env` e configure:

```env
ASAAS_API_KEY=sua_chave_api_do_asaas_aqui
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

### 3. Obter Chave da API Asaas
1. Acesse https://www.asaas.com/
2. Faça login na sua conta
3. Vá em "Integrações" > "API"
4. Copie sua chave de API
5. Cole no arquivo `.env`

### 4. Configurar Firebase
1. Acesse o Console do Firebase
2. Vá em "Configurações do projeto" > "Contas de serviço"
3. Clique em "Gerar nova chave privada"
4. Copie todo o conteúdo JSON
5. Cole no arquivo `.env` na variável `FIREBASE_SERVICE_ACCOUNT`

### 5. Testar a Correção
1. Inicie o servidor: `npm start`
2. Teste a rota: `POST http://localhost:3001/criar-cobranca`
3. Verifique se não há mais erro 404

## Estrutura Corrigida
```
backend/
├── src/
│   └── services/
│       ├── assas.js (NOVO - versão JavaScript)
│       └── assas.ts (original TypeScript)
├── test-api.js (ATUALIZADO - com rota /criar-cobranca)
├── .env (NOVO - variáveis de ambiente)
└── package.json (ATUALIZADO - com node-fetch)
```

## Verificação
Após as configurações, o frontend deve conseguir:
1. Enviar dados para `/criar-cobranca`
2. Receber resposta com link de pagamento
3. Processar pagamento no Asaas sem erro 404