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

## Identidade das agências e rastreamento

O administrador geral anexa, troca ou remove a logo no cadastro da agência. PNG, JPEG e WebP são aceitos até 2 MB, com validação de conteúdo e dimensões. A imagem fica em Storage privado e é servida pela API; agências e parceiros não recebem permissão de upload. A logo e o nome identificam a agência nas linhas de reserva e no relatório de repasse do Uirá. Sem imagem, a identificação usa as iniciais e o nome.

A indicação também acompanha a jornada do formulário antes da compra. O backend valida o contexto opaco e registra somente a identidade comercial, sem taxa de comissão ou contato sem consentimento. Entrar e sair do formulário não cria reserva nem soma venda. Criar a cobrança registra uma reserva, ainda pendente; somente a confirmação verificada pelo Asaas soma uma venda paga e comissão elegível.

O teste integrado pode pular as etapas visuais do checkout: usa as rotas e serviços reais com Firebase, autenticação e Asaas simulados. Ele verifica agências e independentes, entrada/abandono, vínculo da jornada, Pix/cartão, idempotência, filtros de acesso e estornos/cancelamentos. Os portais contabilizam reservas; ainda não exibem contadores de visitantes únicos ou início de checkout para calcular uma taxa percentual de conversão.

Na implantação, confirmar que o bucket configurado por `FIREBASE_STORAGE_BUCKET` e a conta de serviço permitem ler, criar e excluir os objetos de logo. Os testes locais não gravam imagens no bucket de produção.

A revisão visual cobriu os três logins em 320, 390, 768 e 1440 px e as nove abas do CRM em 390 px, com verificações extras de Reservas, Afiliados, Campanhas e painel administrativo em outras larguras. A seleção automatizada de arquivo no Chrome ficou bloqueada pela permissão de acesso a arquivos da extensão; essa permissão não foi alterada. A remoção pela interface, o processamento da imagem e os endpoints de logo foram verificados separadamente.

## Publicação

O pacote atualizado `output/Vagafogo-Hostinger-2026-11-24-refinado-v2.zip` contém os arquivos estáticos para a Hostinger, incluindo as logos, a revisão visual e os cartões de reservas no celular. Extrair o conteúdo na raiz do site, preservando `.htaccess`; não enviar backend, segredos ou `node_modules`. Esta versão substitui os pacotes anteriores do mesmo dia, inclusive o primeiro `refinado` intermediário.

O portal permanece desabilitado por padrão até terminar a migração coordenada. A ordem de publicação e os controles estão em `frontend/FIRESTORE_RULES.md` e `backend/test/AFFILIATE_ACCESS_TESTING.md`. Publicar no GitHub não envia automaticamente os arquivos à Hostinger nem publica as regras Firebase.

As prévias locais usam dados fictícios para os três perfis; os testes de Pix e cartão simulam o provedor e não geram cobrança real.
