# Migração para a WhatsApp Cloud API

O número de produção é `+55 62 99222-5471` (`5562992225471`). O checkout e as cobranças continuam no sistema da Fazenda Vagafogo; a API da Meta substitui apenas o transporte das mensagens.

## Fluxo depois da migração

1. A Meta envia mensagens e estados de entrega para o webhook do gateway do Agente.
2. O gateway preserva o agrupamento de mensagens, bloqueios, atendimento humano, memória temporária e interpretação pela Jatobá.
3. A Jatobá consulta catálogo, preço e disponibilidade no backend Vagafogo.
4. Depois do resumo confirmado, o cliente escolhe PIX ou cartão e recebe um checkout temporário em `https://vagafogo.com.br/reservar`.
5. Nome, e-mail, CPF e pagamento são preenchidos no site, não na conversa. A confirmação continua automática pelo webhook do pagamento.
6. Confirmações, lembretes e campanhas enviados fora da janela de 24 horas usam modelos aprovados pela Meta.

## Configuração no Railway

No serviço do gateway (`Agente-Vagafogo`, processo Node), declarar:

```env
WHATSAPP_PROVIDER=meta_cloud
META_GRAPH_API_VERSION=<versao-atual-configurada-no-app>
META_WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
META_WHATSAPP_BUSINESS_ACCOUNT_ID=<waba-id>
META_WHATSAPP_ACCESS_TOKEN=<token-permanente-do-system-user>
META_APP_SECRET=<app-secret>
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=<segredo-longo-escolhido-pela-equipe>
META_WHATSAPP_BUSINESS_PHONE=5562992225471
```

Cadastrar na Meta o callback:

```text
https://<dominio-publico-do-gateway>/webhooks/whatsapp
```

Assinar o campo `messages`. O verify token deve ser idêntico ao configurado no Railway. O webhook POST é validado pela assinatura `X-Hub-Signature-256`.

No serviço Python do Agente:

```env
WHATSAPP_PROVIDER=meta_cloud
SECURE_CHECKOUT_FOR_PAYMENTS=true
```

No backend principal Vagafogo:

```env
WHATSAPP_PROVIDER=meta_cloud
META_WHATSAPP_TEMPLATE_LANGUAGE=pt_BR
META_TEMPLATE_RESERVA_CONFIRMADA=reserva_confirmada_v1
META_TEMPLATE_BOAS_VINDAS=lembrete_visita_v1
META_TEMPLATE_LEMBRETE_DIA=lembrete_visita_dia_v1
META_TEMPLATE_RESUMO_RESERVAS_DIA=resumo_reservas_dia_v1
META_TEMPLATE_NOVA_RESERVA_DIA=nova_reserva_dia_v1
META_TEMPLATE_ATENDIMENTO_HUMANO=atendimento_humano_v1
WHATSAPP_CAMPAIGNS_ENABLED=true
```

O valor de `AGENT_INTERNAL_API_TOKEN` continua igual nos três serviços.

## Modelos a aprovar

Criar primeiro estes modelos em português do Brasil:

- `reserva_confirmada_v1`, categoria Utility, com sete variáveis no corpo: primeiro nome, experiência, data, horário, participantes, valor e link do Maps.
- `lembrete_visita_v1`, categoria Utility, com quatro variáveis: primeiro nome, data, horário e experiência.
- `lembrete_visita_dia_v1`, categoria Utility, com seis variáveis: primeiro nome, experiência, data, horário, participantes e link do Maps.
- `resumo_reservas_dia_v1`, `nova_reserva_dia_v1` e `atendimento_humano_v1`, categoria Utility, com uma variável de texto para o resumo operacional enviado ao Uirá.
- Um ou mais modelos de Marketing para campanhas. A convenção do CRM usa apenas `{{1}}` para o primeiro nome; o restante do texto deve estar fixo no modelo aprovado. Para campanha com foto, o modelo precisa ter cabeçalho de imagem.

Corpos sugeridos para a aprovação, mantendo exatamente a ordem das variáveis usada pelo sistema:

```text
reserva_confirmada_v1
Olá, {{1}}! 🌿 Sua reserva na Fazenda Vagafogo foi confirmada.

Experiência: {{2}}
Data: {{3}}
Horário: {{4}}
Participantes: {{5}}
Valor: {{6}}

Como chegar: {{7}}
O pagamento já foi identificado automaticamente; não é necessário enviar comprovante.
```

```text
lembrete_visita_v1
Olá, {{1}}! 🌿 Estamos preparando sua visita à Fazenda Vagafogo.

Data: {{2}}
Horário: {{3}}
Experiência: {{4}}
```

```text
lembrete_visita_dia_v1
Bom dia, {{1}}! 🌿 A Fazenda Vagafogo espera você hoje.

Experiência: {{2}}
Data: {{3}}
Horário: {{4}}
Participantes: {{5}}

Durante o trajeto, siga as placas de acesso. Localização: {{6}}
```

Nos três modelos internos, use respectivamente `🌿 Resumo operacional das reservas de hoje:\n\n{{1}}`, `🌿 Nova reserva para hoje:\n\n{{1}}` e `👤 Atendimento humano necessário:\n\n{{1}}`, fornecendo como exemplo da variável um resumo operacional completo. Em cada modelo de Marketing, use `{{1}}` uma única vez para o primeiro nome. O CRM só lista modelos aprovados compatíveis; com foto ele exige cabeçalho de imagem e sem foto exige cabeçalho textual/ausente.

O CRM consulta os modelos aprovados diretamente na Meta e exige a escolha de um modelo para cada variação. Na API oficial, somente contatos com aceite explícito recebem marketing; contatos sem resposta continuam visíveis na auditoria, mas ficam excluídos do envio.

## Corte seguro

1. Criar app, system user, token permanente, webhook e modelos.
2. Configurar todas as variáveis mantendo `WHATSAPP_PROVIDER=baileys`.
3. Validar o webhook e a listagem dos modelos.
4. Alterar primeiro o backend Python e o backend principal para `meta_cloud`. O gateway ainda em Baileys continua aceitando os envios durante essa preparação.
5. Alterar o gateway por último para `meta_cloud`; a partir desse ponto a API oficial recebe e envia as mensagens.
6. Fazer testes de entrada, resposta na janela de 24 horas, confirmação de reserva, checkout PIX/cartão e uma campanha interna.
7. Só depois habilitar campanhas reais.

Não remover os dados da sessão Baileys no primeiro corte. Eles permanecem como rollback enquanto a API oficial é homologada.

## Custos e métricas

Os webhooks registram enviado, entregue, lido, falha, categoria e indicação de cobrança em `crm_whatsapp_mensagens_status`. O endpoint administrativo `GET /crm/whatsapp/metricas?dias=30` consolida volume e estimativa. Tarifas podem ser informadas nas variáveis `META_WHATSAPP_RATE_*_BRL`; o valor definitivo deve ser conferido no faturamento da Meta.
