# 🔧 Solução para Problemas de Conexão Firebase

## Problema Identificado
Erro 400 (Bad Request) ao tentar conectar com o Firestore, indicando problema de configuração ou permissões.

## Soluções Passo a Passo

### 1. Verificar Regras do Firestore
```bash
# Aplicar as regras do Firestore
firebase deploy --only firestore:rules
```

### 2. Verificar Configuração do Projeto
1. Acesse o [Console Firebase](https://console.firebase.google.com)
2. Selecione o projeto "banco-vaga-fogo"
3. Vá em "Configurações do projeto" > "Geral"
4. Confirme se as configurações estão corretas

### 3. Verificar Permissões de API
1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Selecione o projeto "banco-vaga-fogo"
3. Vá em "APIs e serviços" > "Biblioteca"
4. Certifique-se que estas APIs estão habilitadas:
   - Cloud Firestore API
   - Firebase Authentication API
   - Identity and Access Management (IAM) API

### 4. Testar Conexão
1. Abra o painel administrativo
2. Use o botão "Executar Testes" no componente de diagnóstico
3. Se falhar, use "Limpar Cache"

### 5. Verificar Dados no Banco
Execute o script de diagnóstico:
```bash
cd frontend
node ../fix-firestore.js
```

### 6. Comandos de Emergência

#### Reinicializar Firebase
```bash
firebase logout
firebase login
firebase use banco-vaga-fogo
```

#### Verificar Status do Projeto
```bash
firebase projects:list
firebase use --add
```

#### Aplicar Todas as Configurações
```bash
firebase deploy
```

## Possíveis Causas do Erro 400

1. **Regras do Firestore não aplicadas**
   - Solução: `firebase deploy --only firestore:rules`

2. **APIs não habilitadas**
   - Solução: Habilitar APIs no Google Cloud Console

3. **Projeto Firebase não existe ou foi deletado**
   - Solução: Verificar no Console Firebase

4. **Credenciais inválidas**
   - Solução: Regenerar configuração no Console Firebase

5. **Cache corrompido**
   - Solução: Limpar cache do navegador e usar "Limpar Cache" no diagnóstico

## Verificação Final

Após aplicar as soluções:
1. Recarregue a página do painel administrativo
2. Execute o teste de diagnóstico
3. Tente buscar reservas para uma data específica
4. Verifique se os dados aparecem corretamente

## Contatos de Suporte

Se o problema persistir:
1. Verifique os logs do console do navegador
2. Capture screenshots dos erros
3. Documente os passos que levaram ao erro