# Integracao Vagafogo + Agente

Os servicos continuam separados e cada Railway acompanha seu proprio repositorio:

- `TechLoui/Vagafogo`: site, `/CRM`, `/agente`, reservas, disponibilidade,
  Asaas, leads, campanhas, relatorios e atribuicao.
- `TechLoui/Agente-Vagafogo`: gateway Baileys e backend Python/DeepSeek.

O Firebase original do Agente nao deve ser trocado. Ele preserva a sessao do
WhatsApp, o prompt e o modo `human`/`blocked` por contato. Conversas, audios e
transcricoes ficam somente em memoria. Dados comerciais sao gravados apenas no
`banco-vagafogo`, por APIs internas autenticadas.

## Variaveis do Railway

Use um unico segredo longo e aleatorio nos tres servicos. Nao grave esse valor
no Git.

### Vagafogo

```env
AGENT_GATEWAY_URL=https://agente-vagafogo-production.up.railway.app
AGENT_AI_URL=https://backend-production-51a3.up.railway.app
AGENT_INTERNAL_API_TOKEN=<segredo-compartilhado>
PUBLIC_SITE_BASE_URL=https://vagafogo.com.br
PUBLIC_API_BASE_URL=https://vagafogo-production.up.railway.app
WHATSAPP_CAMPAIGNS_ENABLED=false
```

### Agente — Bot

```env
MAIN_BACKEND_URL=https://vagafogo-production.up.railway.app
INTERNAL_API_TOKEN=<segredo-compartilhado>
REQUIRE_AUTH=1
```

Manter `numReplicas=1`, `overlapSeconds=0`, scale-to-zero desligado e o Firebase
original do Agente.

### Agente — Backend Python

```env
VAGAFOGO_API_URL=https://vagafogo-production.up.railway.app
INTERNAL_API_TOKEN=<segredo-compartilhado>
REQUIRE_AUTH=1
```

Manter a chave DeepSeek e o Firebase original do Agente.

## Publicacao

1. Publicar as regras em `frontend/firestore.rules` no projeto `banco-vagafogo`.
2. Publicar o repositorio `Agente-Vagafogo` e aguardar os dois health checks.
3. Configurar as variaveis acima nos tres servicos.
4. Publicar o repositorio `Vagafogo`.
5. Entrar em `/agente` com o mesmo login do CRM.
6. Na aba **Testar reserva**, validar os cinco itens do diagnostico e executar
   uma simulacao. Ela nao cria reserva e nao gera cobranca.
7. Na aba **Assistente**, simular uma conversa completa. O modo de teste nao
   cria PIX nem grava lead.
8. Na aba **WhatsApp**, confirmar o numero conectado e enviar uma mensagem de
   teste para o numero interno.
9. No CRM, enviar um teste de campanha em texto e outro com foto + legenda.
10. Criar uma reserva PIX real controlada pelo Agente e confirmar: QR Code,
    copia e cola, webhook de pagamento, mensagem de sucesso, lead estruturado e
    ausencia de conversa bruta no Firestore.
11. Somente depois da homologacao, mudar `WHATSAPP_CAMPAIGNS_ENABLED=true`.

## Criterios de aceite

- Contato em modo `blocked` nao recebe bot, mensagem manual, teste, campanha ou
  confirmacao transacional.
- Reserva manual nao gera aviso de nova reserva.
- Campanha mostra elegiveis, fila, enviados, entregues, lidos, respostas,
  cliques, reservas, pagamentos, receita e erros.
- Cada destinatario recebe um link individual; a reserva e a receita voltam
  para a campanha de origem.
- Cartao nunca e coletado no WhatsApp; o cliente recebe o link seguro do site.
- O Agente nao possui credenciais do banco principal ou do Asaas.
- O banco do Agente nao recebe mensagens, audios, transcricoes, leads,
  pagamentos ou reservas.

