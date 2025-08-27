@echo off
echo Aplicando regras do Firestore...
firebase deploy --only firestore:rules
echo Regras aplicadas com sucesso!
pause