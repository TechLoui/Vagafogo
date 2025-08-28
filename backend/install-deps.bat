@echo off
echo Instalando dependencias do backend...
npm install
echo.
echo Dependencias instaladas com sucesso!
echo.
echo IMPORTANTE: Configure as variaveis de ambiente no arquivo .env:
echo - ASAAS_API_KEY: Sua chave da API do Asaas
echo - FIREBASE_SERVICE_ACCOUNT: Suas credenciais do Firebase
echo.
pause