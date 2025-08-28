# Configuração Railway - Variáveis de Ambiente

## ⚠️ IMPORTANTE: Configure estas variáveis no Railway

Acesse o painel do Railway e configure as seguintes variáveis de ambiente:

### 1. ASAAS_API_KEY
```
ASAAS_API_KEY=sua_chave_api_do_asaas_aqui
```

**Como obter:**
1. Acesse https://www.asaas.com/
2. Faça login na sua conta
3. Vá em "Integrações" > "API"
4. Copie sua chave de API

### 2. FIREBASE_SERVICE_ACCOUNT
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"banco-vagafogo",...}
```

**Como obter:**
1. Acesse o Console do Firebase
2. Vá em "Configurações do projeto" > "Contas de serviço"
3. Clique em "Gerar nova chave privada"
4. Copie todo o conteúdo JSON (uma linha só)

## Como configurar no Railway:

1. Acesse https://railway.app/
2. Vá no seu projeto Vagafogo
3. Clique na aba "Variables"
4. Adicione as duas variáveis acima
5. Clique em "Deploy" para aplicar

## Verificação:

Após configurar, o log do Railway deve mostrar:
```
🚀 API rodando na porta 3001
Token Asaas carregado: SIM
```

Se mostrar "Token Asaas carregado: NÃO", verifique se a variável ASAAS_API_KEY foi configurada corretamente.

## Teste da Correção:

1. Acesse seu site na Hostinger
2. Tente fazer uma reserva
3. Não deve mais aparecer erro 404
4. Deve criar cobrança no Asaas normalmente