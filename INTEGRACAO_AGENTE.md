# Integracao Vagafogo + Agente

Os servicos continuam separados e cada Railway acompanha seu proprio repositorio:

- `TechLoui/Vagafogo`: site, `/CRM`, `/agente`, reservas, disponibilidade,
  Asaas, leads, campanhas, relatorios e atribuicao.
- `TechLoui/Agente-Vagafogo`: gateway Baileys e backend Python/DeepSeek.

O Firebase original do Agente nao deve ser trocado. Ele preserva a sessao do
WhatsApp, o prompt e o modo `human`/`blocked` por contato. Conversas ficam
temporariamente no Firebase original do Agente por ate sete dias para permitir
retomada apos reinicio; audios nao sao baixados, armazenados nem transcritos.
Dados comerciais sao gravados apenas no `banco-vagafogo`, por APIs internas
autenticadas.

## Ciclo de vida dos leads

1. O primeiro sinal comercial cria um unico acompanhamento por telefone. Para
   celulares brasileiros, numeros com e sem o nono digito usam a mesma
   identidade canonica.
2. Novos dados atualizam esse documento; uma interpretacao tardia nunca regride
   `dados_em_coleta`, `pagamento_pendente` ou `reserva_confirmada`.
3. Duvida resolvida seguida de agradecimento ou despedida fecha imediatamente
   como `atendimento_concluido/duvida_resolvida`.
4. Se o bot estiver aguardando resposta, o gateway tenta retomar duas vezes e
   respeita a janela configurada (padrao 07:45-18:00). Na terceira etapa ele
   apenas avisa que o atendimento foi suspenso e fecha o lead no CRM.
5. O retorno depois da suspensao retoma o mesmo ciclo e preserva os dados ja
   coletados. Um novo interesse depois de um resultado terminal abre um novo
   ciclo no mesmo contato, limpando somente os dados comerciais da oportunidade
   anterior.
6. O webhook de pagamento e soberano: confirma a reserva, consolida aliases e
   impede qualquer atualizacao tardia de voltar o lead para pendente.
7. Saudacoes isoladas, recados, fornecedores e operadores autorizados nao criam
   lead. Atendimento humano e contatos bloqueados nao recebem retomadas.

## Fluxo oficial de reserva pelo Agente

1. Consultar o catalogo atual, incluindo experiencias individuais, combos,
   categorias, precos, horarios, avisos e perguntas obrigatorias.
2. Receber os dados em qualquer ordem. A cada mensagem, atualizar o checklist
   temporario e perguntar somente o que ainda falta.
3. Para combos, validar cada pacote incluído. Cada pacote com hora marcada
   recebe seu horario; pacotes em faixa usam inicio/fim configurados.
4. Coletar uma idade para cada categoria marcada com `perguntarIdade=true`.
5. Havendo participante bariatrico, explicar a carteirinha e registrar que o
   cliente confirmou essa orientacao.
6. Consultar disponibilidade e valor no backend Vagafogo. O retorno
   `prontoParaPagamento=false` impede a cobranca e lista os requisitos faltantes.
7. Coletar nome, e-mail, CPF, pet, perguntas de todos os pacotes, preferencia de
   pagamento e consentimento de marketing separado.
8. Recapitular oferta, itens do combo, data, horarios, categorias, idades e valor;
   gerar pagamento somente apos confirmacao explicita.
9. PIX: enviar a imagem do QR sem legenda e, em seguida, somente o copia e cola.
   URLs do Asaas nunca sao expostas.
10. Cartao: enviar apenas uma URL `https://vagafogo.com.br/reservar?...` com a
    oferta/data/horario preselecionados. Dados do cartao nunca passam pelo bot.
11. A confirmacao ocorre somente pelo webhook. Depois do pagamento, enviar
    codigo, detalhes dos itens, participantes e orientacoes da visita.
12. Audio: nao baixar, transcrever ou guardar; orientar texto ou o formulario
    oficial em `https://vagafogo.com.br/reservar`.

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
6. Na aba **Diagnostico**, validar manualmente os servicos.
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
- O Agente sempre apresenta combos ativos aplicaveis, coleta idades obrigatorias
  e bloqueia o PIX enquanto houver requisito pendente.
- Nenhuma resposta do Agente contem `invoiceUrl` ou qualquer URL do Asaas.
- O QR PIX e enviado sem legenda; o copia e cola vai na mensagem seguinte.
- O Agente nao possui credenciais do banco principal ou do Asaas.
- O banco do Agente recebe apenas o historico temporario de ate sete dias,
  sessao, prompt e controles operacionais; nunca recebe audio, transcricao,
  lead, pagamento ou reserva.

