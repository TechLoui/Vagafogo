const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolverPoliticaEdicaoCampanhaWhatsapp,
} = require("../dist/services/whatsappCampaigns.js");

test("rascunho permite editar inclusive o publico", () => {
  const policy = resolverPoliticaEdicaoCampanhaWhatsapp(
    "rascunho",
    "inactive180",
    30,
    "brunch",
    60,
  );
  assert.equal(policy.preservarProgresso, false);
});

test("campanha pausada permite editar sem alterar o publico", () => {
  const policy = resolverPoliticaEdicaoCampanhaWhatsapp(
    "pausada",
    "inactive180",
    30,
    "inactive180",
    30,
  );
  assert.equal(policy.preservarProgresso, true);
});

test("campanha pausada bloqueia troca de publico para evitar duplicidade", () => {
  assert.throws(
    () => resolverPoliticaEdicaoCampanhaWhatsapp("pausada", "inactive180", 30, "brunch", 30),
    /CAMPAIGN_AUDIENCE_LOCKED_AFTER_START/,
  );
  assert.throws(
    () => resolverPoliticaEdicaoCampanhaWhatsapp("pausada", "inactive180", 30, "inactive180", 0),
    /CAMPAIGN_AUDIENCE_LOCKED_AFTER_START/,
  );
});

test("campanha ativa precisa ser pausada antes da edicao", () => {
  assert.throws(
    () => resolverPoliticaEdicaoCampanhaWhatsapp("enviando", "inactive180", 30, "inactive180", 30),
    /CAMPAIGN_EDIT_REQUIRES_DRAFT_OR_PAUSED/,
  );
});
