const { test } = require("node:test");
const assert = require("node:assert/strict");
const { shouldOfferEnvironmentalEducationContact } = require("../dist/services/siteEnvironmentalEducation");
const { pendingSiteVisitorRequest } = require("../dist/services/siteChatIdentity");

test("oferece contato para educacao ambiental e visitas escolares", () => {
  for (const message of [
    "Quero saber da Educação Ambiental.",
    "Sou coordenadora de uma escola pública e quero um passeio escolar.",
    "Tem programação para um grupo de estudantes do IFB?",
    "Gostaria de uma visita escolar com minha turma.",
  ]) {
    assert.equal(shouldOfferEnvironmentalEducationContact(message), true, message);
  }
});

test("nao oferece contato para reserva comum", () => {
  for (const message of [
    "Quero reservar brunch e trilha para amanhã.",
    "Quanto custa para duas crianças?",
    "Sou professora, mas quero ir com minha família.",
  ]) {
    assert.equal(shouldOfferEnvironmentalEducationContact(message), false, message);
  }
});

test("preserva o pedido de educacao ambiental feito antes da identificacao", () => {
  assert.equal(pendingSiteVisitorRequest([
    { from: "client", text: "Educação Ambiental" },
    { from: "client", text: "Meu nome é Andrea Viana" },
    { from: "client", text: "Meu WhatsApp é (61) 99223-3766" },
  ]), "Educação Ambiental");
});
