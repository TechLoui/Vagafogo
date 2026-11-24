# Firestore e Storage: acesso e publicação

A política versionada em `firestore.rules` e `storage.rules` separa o administrador do CRM, agências, parceiros e visitantes. Ela precisa ser publicada junto da migração descrita abaixo; substituir apenas as regras interrompe o site antigo.

## Acesso previsto

| Dados | Visitante, agência e parceiro | Administrador do CRM | Backend |
| --- | --- | --- | --- |
| Catálogo e disponibilidade | Leitura | Leitura e escrita | Leitura e escrita |
| Reservas, CRM, mesas e configurações privadas | Negado diretamente | Acesso aprovado pelo servidor | Identidade de serviço autenticada |
| `configuracoes/site` | Leitura | Leitura e escrita | Leitura e escrita |
| Afiliados, vínculos, convites, indicação e evidência financeira | Somente APIs com escopo validado | Somente APIs administrativas | Firebase Admin SDK |
| Formulários e respostas | Somente APIs específicas | Somente APIs administrativas | Firebase Admin SDK |
| Ícones públicos no Storage | Leitura | Gestão | Gestão |
| Mídia privada no Storage | Negado | Gestão autorizada | Gestão |

Uma conta Firebase autenticada não recebe acesso de administrador automaticamente. O backend verifica o ID token, sua revogação e a autorização administrativa; então registra `_crm_admin_access/{uid}` com vencimento no máximo igual ao do token. O navegador renova essa aprovação ao renovar a sessão. Clientes não podem escrever esse registro nem os próprios papéis.

As operações legadas do backend que usam Firebase Web SDK passam a autenticar a identidade reservada `vagafogo-server-backend`, com a claim `serverBackend:true`, quando a migração é habilitada. O bootstrap usa credenciais administrativas somente no servidor e falha sem recorrer a acesso anônimo.

A ocupação pública usa `/api/public/occupancy` com contagens agregadas. A consulta de reserva usa `/api/public/reservations/lookup`, exige CPF e código imprevisível da reserva e consulta um único documento. Nenhum desses endpoints libera o histórico do cliente ou a atribuição comercial.

## Ordem de publicação

1. Manter `AFFILIATES_ENABLED=false` e não criar contas externas durante a preparação.
2. Publicar o backend compatível e enviar o novo `frontend/dist` à Hostinger, incluindo `.htaccess`. Conferir reserva pública, consulta e login do administrador.
3. Configurar `BACKEND_FIREBASE_AUTH_REQUIRED=true` e confirmar que o backend iniciou autenticado.
4. Publicar Firestore e Storage juntos, após validar o acesso administrativo. A referência `frontend/firebase.json` já inclui ambas as políticas.
5. Conferir negações de leitura direta e então habilitar `AFFILIATES_ENABLED=true`.

Depois de criar contas externas, manter as regras privadas e `BACKEND_FIREBASE_AUTH_REQUIRED=true`, inclusive ao desabilitar temporariamente o portal. Não restaurar o backend anônimo nem o frontend antigo.

## Verificação

`npm run validate:firestore-rules` executa a validação estrutural. Os testes reais em emuladores Firestore e Storage e os comandos para repeti-los estão em `../backend/test/AFFILIATE_ACCESS_TESTING.md`. Foram verificados seis cenários locais em 24/11/2026. Isso não publica regras nem verifica as permissões IAM de produção.

A implantação com Firebase CLI deve selecionar explicitamente o projeto correto e incluir `firestore:rules`, `firestore:indexes` e `storage`. Se o Firebase solicitar a permissão do agente de serviço para leituras do Firestore nas regras de Storage, essa etapa também precisa ser concluída antes de liberar o portal.
