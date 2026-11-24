# Afiliados: entrega de 24/11/2026

## Funcionamento

- Uirá continua como administrador geral no CRM e cria agências e parceiros independentes.
- A agência gerencia somente seus próprios parceiros. Parceiros vinculados não recebem uma comissão individual adicional.
- Cada parceiro possui um link de indicação para `/reservar` e acesso de leitura ao seu resumo de reservas pagas, pendentes e canceladas.
- Uirá configura comissão percentual ou fixa por reserva para a agência ou para o parceiro independente. A regra é preservada na reserva; alterar a configuração não recalcula reservas anteriores.
- Taxas e valores de comissão aparecem somente para Uirá. O pagamento é manual, fora do sistema; não existe split automático nem repasse automático da agência aos parceiros.
- A comissão exige pagamento confirmado pelo provedor. Cancelamento/estorno deixa de ser elegível. A regra de afiliados não altera a comissão geral legada do checkout.

## Acessos

O CRM contém a aba **Afiliados**. As rotas externas são `/afiliados/login`, `/agencia` e `/parceiro`. O administrador gera um link de ativação para a pessoa criar a própria senha. O convite vence em 48 horas e só pode ser usado uma vez. Não são criadas contas reais nem enviadas mensagens nos testes locais.

A indicação é validada no servidor; IDs e regras de comissão enviados pelo navegador não definem o vínculo. O contexto dura sete dias, é preservado no checkout e no atendimento vinculado à sessão e só é atribuído a perfis ativos. A reserva mantém o vínculo capturado na criação da cobrança.

A consulta pública exige **CPF + código da reserva**, sem pesquisar histórico pelo CPF. O comprovante, os links de consulta e a confirmação de pagamento disponibilizam o código.

## Publicação

O pacote final `output/Vagafogo-Hostinger-2026-11-24-final.zip` contém os arquivos estáticos para a Hostinger. Extrair o conteúdo na raiz do site, preservando `.htaccess`; não enviar backend, segredos ou `node_modules`. Esta é a versão final; o pacote anterior do mesmo dia foi uma compilação intermediária.

O portal permanece desabilitado por padrão até terminar a migração coordenada. A ordem de publicação e os controles estão em `frontend/FIRESTORE_RULES.md` e `backend/test/AFFILIATE_ACCESS_TESTING.md`. Publicar no GitHub não envia automaticamente os arquivos à Hostinger nem publica as regras Firebase.

As prévias locais usam dados fictícios para os três perfis; os testes de Pix e cartão simulam o provedor e não geram cobrança real.
