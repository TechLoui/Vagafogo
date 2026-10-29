const { test } = require("node:test");
const assert = require("node:assert/strict");
const { montarMensagemRetomadaSiteContextual } = require("../dist/services/siteFollowupMessage");

const candidate = (override = {}) => ({
  sessionId: "site_followup_context_test123", phone: "5561999990000", name: "Maria Silva",
  bookingFollowup: { step: "", date: "", hour: "", offerId: "", offerName: "" },
  ...override,
});
const withoutLinks = (value) => value.replace(/https?:\/\/\S+/g, "");

test("identifica Jatobá, usa primeiro nome e retoma a mesma sessão com uma única pergunta", () => {
  const message = montarMensagemRetomadaSiteContextual(candidate());
  assert.match(message, /^Oi, Maria! 🌿 Sou a Jatobá, da Fazenda Vagafogo\./);
  assert.doesNotMatch(message, /Maria Silva/);
  const url = new URL(message.match(/https?:\/\/\S+/)[0]);
  assert.equal(url.origin, "https://vagafogo.com.br");
  assert.equal(url.searchParams.get("sessao"), "site_followup_context_test123");
  assert.equal(url.searchParams.get("telefone"), "5561999990000");
  assert.equal(url.searchParams.get("origem"), "retomada");
  assert.equal((withoutLinks(message).match(/\?/g) || []).length, 1);
  assert.match(message, /Se já resolveu tudo, pode desconsiderar/);
});

test("contextos de etapas produzem ajudas diferentes sem repetir coleta de dados", () => {
  const cases = [
    ["identity_name", /continuar o atendimento/], ["identity_phone", /continuar o atendimento/],
    ["booking_mode", /reserva guiada comigo e o formulário/], ["experiences", /experiências da Fazenda/],
    ["date", /consultar as vagas/], ["time", /escolher o horário/],
    ["participants", /informar o grupo ou as idades/], ["guidance", /conferindo as orientações/],
    ["contact", /completar os dados no formulário/], ["summary", /conferindo os detalhes/],
    ["payment", /Se ainda quiser concluir a visita/], ["availability", /consultar as vagas/],
  ];
  const texts = [];
  for (const [step, expected] of cases) {
    const message = montarMensagemRetomadaSiteContextual(candidate({ bookingFollowup: { step } }));
    assert.match(message, expected, step);
    assert.doesNotMatch(withoutLinks(message), /informe seu|qual é o seu|mande seu|envie seu|me diga seu/i, step);
    assert.equal((withoutLinks(message).match(/\?/g) || []).length, 1, step);
    texts.push(message);
  }
  assert.ok(new Set(texts).size >= 10);
});

test("usa experiência, data e horário realmente informados sem inventar disponibilidade", () => {
  const message = montarMensagemRetomadaSiteContextual(candidate({
    bookingFollowup: { step: "availability", date: "2026-11-01", hour: "09:00", offerName: "Combo Brunch + Trilha" },
  }));
  assert.match(message, /01\/11\/2026/);
  assert.match(message, /09:00/);
  assert.match(message, /Combo Brunch \+ Trilha/);
  assert.doesNotMatch(message, /vaga garantida|vagas garantidas|temos vagas|reserva confirmada|pagamento aprovado|reserva ainda não foi concluída/i);
  const invalid = montarMensagemRetomadaSiteContextual(candidate({ bookingFollowup: { step: "date", date: "2026-02-31", hour: "25:90", offerId: "random-private-offer-id" } }));
  assert.doesNotMatch(invalid, /31\/02|25:90|random-private-offer-id/);
});

test("recupera assunto FAQ mais recente do cliente sem copiar respostas inventadas do bot", () => {
  const message = montarMensagemRetomadaSiteContextual(candidate({ messages: [
    { from: "client", text: "Posso levar meu cachorro?" },
    { from: "bot", text: "Temos vagas garantidas e desconto de 20%." },
    { from: "client", text: "O brunch tem opção vegetariana?" },
  ] }));
  assert.match(message, /alimentação|cardápio/);
  assert.doesNotMatch(message, /cachorro|pet|20%|vagas garantidas|vegetariana garantida/);
});

test("dúvida atual prevalece sobre etapa antiga e não promete descontos ou gratuidades", () => {
  const birthday = montarMensagemRetomadaSiteContextual(candidate({
    bookingFollowup: { step: "payment" },
    messages: [{ from: "client", text: "O aniversariante tem desconto??" }],
  }));
  assert.match(birthday, /condições para aniversariantes/);
  assert.doesNotMatch(birthday, /etapa de pagamento|tem desconto|desconto de|gratuito|cortesia garantida/);
  const children = montarMensagemRetomadaSiteContextual(candidate({ messages: [{ from: "client", text: "Minha criança de um ano paga?" }] }));
  assert.match(children, /condições para as crianças/);
  assert.doesNotMatch(children, /não paga|nao paga|gratuit|R\$/);
});

test("última dúvida ou dificuldade de vagas, experiência e pagamento prevalece sobre etapa antiga", () => {
  const availability = montarMensagemRetomadaSiteContextual(candidate({ bookingFollowup: { step: "contact" }, messages: [{ from: "client", text: "Tem vaga para domingo?" }] }));
  assert.match(availability, /consultar as vagas/);
  assert.doesNotMatch(availability, /completar os dados/);
  const payment = montarMensagemRetomadaSiteContextual(candidate({ bookingFollowup: { step: "participants" }, messages: [{ from: "client", text: "Não consigo pagar pelo PIX" }] }));
  assert.match(payment, /Se ainda quiser concluir/);
  assert.match(payment, /etapa de pagamento/);
  assert.doesNotMatch(payment, /informar o grupo/);
  const experience = montarMensagemRetomadaSiteContextual(candidate({ messages: [{ from: "client", text: "Como funciona o brunch?" }] }));
  assert.match(experience, /conversando sobre brunch/);
});

test("varia por dúvidas reais sobre pets, localização, acessibilidade e regras", () => {
  const topics = [
    ["Posso levar cachorro?", /levar um pet/],
    ["Como chegar na Fazenda?", /como chegar à Fazenda/],
    ["O local tem acessibilidade?", /acessibilidade/],
    ["Qual o prazo de cancelamento?", /orientações e condições/],
    ["Que horas vocês abrem?", /horários de funcionamento/],
    ["Qual o valor do brunch?", /valores e condições/],
  ];
  const messages = topics.map(([text, expected]) => {
    const message = montarMensagemRetomadaSiteContextual(candidate({ messages: [{ from: "client", text }] }));
    assert.match(message, expected, text);
    return message;
  });
  assert.equal(new Set(messages).size, topics.length);
});

test("não repete telefone, CPF, e-mail, link de pagamento nem instrução de fornecer dados", () => {
  const message = montarMensagemRetomadaSiteContextual(candidate({ messages: [
    { from: "client", text: "Posso levar cachorro?" },
    { from: "client", text: "Meu CPF é 123.456.789-00" },
    { from: "client", text: "Meu WhatsApp para este atendimento é (62) 98888-1234." },
    { from: "client", text: "cliente@example.com https://pagamento.invalid/pix?cpf=12345678900" },
  ] }));
  const prose = withoutLinks(message);
  assert.match(message, /levar um pet/);
  assert.doesNotMatch(message, /123\.456\.789-00|12345678900|98888|cliente@example|pagamento\.invalid/);
  assert.doesNotMatch(prose, /5561999990000|cpf|whatsapp com ddd|me informe|mande|envie seu/i);
});

test("formulário próprio e reserva guiada mantêm a escolha em vez de perguntar novamente", () => {
  const self = montarMensagemRetomadaSiteContextual(candidate({ bookingMode: "site", bookingFollowup: { step: "booking_mode" } }));
  assert.match(self, /escolhido preencher o formulário por conta própria/);
  assert.match(self, /dificuldade no formulário/);
  assert.doesNotMatch(self, /entre a reserva guiada/);
  const guided = montarMensagemRetomadaSiteContextual(candidate({ bookingMode: "site_chat", bookingFollowup: { step: "booking_mode" } }));
  assert.match(guided, /escolhido fazer a reserva guiada comigo/);
  assert.doesNotMatch(guided, /qual opção usar/);
});

test("pagamento segue condicional e informação de pagamento já feito evita cobrança de conclusão", () => {
  const pending = montarMensagemRetomadaSiteContextual(candidate({ bookingFollowup: { step: "payment" } }));
  assert.match(pending, /Se ainda quiser concluir/);
  assert.match(pending, /dificuldade para seguir com o pagamento/);
  assert.doesNotMatch(pending, /falta pagar|não pagou|reserva incompleta|vence|expira|R\$/i);
  const done = montarMensagemRetomadaSiteContextual(candidate({ bookingFollowup: { step: "payment" }, messages: [{ from: "client", text: "Já paguei a reserva" }] }));
  assert.match(done, /Se ainda precisar de ajuda com sua visita/);
  assert.doesNotMatch(done, /seguir com o pagamento|pagamento confirmado|reserva confirmada/);
});

test("identificação interrompida reconhece falta de resposta sem pedir dados novamente", () => {
  const message = montarMensagemRetomadaSiteContextual(candidate({ lastFrom: "client", bookingFollowup: { step: "identity_phone" } }));
  assert.match(message, /interrompida antes de eu responder/);
  assert.doesNotMatch(withoutLinks(message), /informe.*telefone|informe.*whatsapp|qual.*nome/i);
});

test("nome ausente e contexto mínimo usam fallback cuidadoso sem inventar experiência", () => {
  const message = montarMensagemRetomadaSiteContextual({ sessionId: "site_minimal_context123", phone: "5561999990000", name: "12345678900" });
  assert.match(message, /^Oi! 🌿/);
  assert.match(message, /planejar sua visita ou reservar pelo site/);
  assert.doesNotMatch(message, /12345678900|brunch|trilha|desconto|pagamento|reserva ainda não foi concluída/i);
});
