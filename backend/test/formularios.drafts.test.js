'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const firebaseAdmin = require('../dist/services/firebaseAdmin.js');
const { FormularioValidationError } = require('../dist/validation/formularios.js');
const {
  atualizarStatusFormularioAdmin,
  listarFormulariosAdmin,
} = require('../dist/services/formulariosAdmin.js');
const {
  FormularioPublicoServiceError,
  obterFormularioPublico,
  registrarRespostaFormulario,
} = require('../dist/services/formulariosPublicos.js');

const originalObterFirestoreAdmin = firebaseAdmin.obterFirestoreAdmin;
const PUBLIC_ID = 'form_publico_draft_1234';
const FORM_ID = 'form_doc_draft_1234';

const incompleteDraft = () => ({
  publicId: PUBLIC_ID,
  schemaVersion: 1,
  revision: 1,
  title: 'Rascunho incompleto',
  description: '',
  status: 'draft',
  fields: [
    {
      id: 'sem_titulo',
      type: 'short_text',
      label: '',
      required: false,
    },
    {
      id: 'uma_opcao',
      type: 'single_choice',
      label: 'Escolha',
      required: false,
      options: ['Unica'],
    },
  ],
  confirmationTitle: 'Resposta enviada!',
  confirmationMessage: 'Obrigado por responder.',
  privacyMessage: '',
  submitButtonLabel: 'Enviar resposta',
  responseCount: 0,
});

test.afterEach(() => {
  firebaseAdmin.obterFirestoreAdmin = originalObterFirestoreAdmin;
});

test('lista rascunho com campos incompletos sem omiti-lo do painel', async () => {
  firebaseAdmin.obterFirestoreAdmin = () => ({
    collection(name) {
      assert.equal(name, 'formularios');
      return {
        async get() {
          return {
            docs: [{ id: FORM_ID, data: () => incompleteDraft() }],
          };
        },
      };
    },
  });

  const forms = await listarFormulariosAdmin();

  assert.equal(forms.length, 1);
  assert.equal(forms[0].fields[0].label, '');
  assert.deepEqual(forms[0].fields[1].options, ['Unica']);
});

test('impede promover rascunho incompleto para published ou closed', async () => {
  let updates = 0;
  const formRef = { id: FORM_ID };
  firebaseAdmin.obterFirestoreAdmin = () => ({
    collection(name) {
      assert.equal(name, 'formularios');
      return {
        doc(id) {
          assert.equal(id, FORM_ID);
          return formRef;
        },
      };
    },
    async runTransaction(operation) {
      return operation({
        async get(ref) {
          assert.equal(ref, formRef);
          return { exists: true, data: () => incompleteDraft() };
        },
        update() {
          updates += 1;
        },
      });
    },
  });

  for (const status of ['published', 'closed']) {
    await assert.rejects(
      atualizarStatusFormularioAdmin(
        FORM_ID,
        status,
        { uid: 'admin_teste' },
        1,
      ),
      (error) => {
        assert.ok(error instanceof FormularioValidationError);
        assert.equal(error.code, 'INVALID_FORM_SCHEMA');
        assert.equal(error.status, 422);
        return true;
      },
    );
  }
  assert.equal(updates, 0);
});

test('endpoint publico oculta rascunho antes de validar seus campos', async () => {
  const formDocument = {
    id: FORM_ID,
    ref: { id: FORM_ID },
    exists: true,
    data: () => incompleteDraft(),
  };
  firebaseAdmin.obterFirestoreAdmin = () => ({
    collection(name) {
      return {
        doc(id) {
          if (name === '_formularios_public_ids') {
            assert.equal(id, PUBLIC_ID);
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({ formId: FORM_ID }),
                };
              },
            };
          }
          assert.equal(name, 'formularios');
          assert.equal(id, FORM_ID);
          return { get: async () => formDocument };
        },
      };
    },
  });

  await assert.rejects(
    obterFormularioPublico(PUBLIC_ID),
    (error) => {
      assert.ok(error instanceof FormularioPublicoServiceError);
      assert.equal(error.code, 'FORM_NOT_AVAILABLE');
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test('submissao em rascunho incompleto responde FORM_CLOSED antes do schema estrito', async () => {
  let responseRef;
  let writes = 0;
  const formRef = {
    id: FORM_ID,
    collection(name) {
      assert.equal(name, 'respostas');
      return {
        doc(id) {
          responseRef = { id };
          return responseRef;
        },
      };
    },
  };
  const formDocument = {
    id: FORM_ID,
    ref: formRef,
    exists: true,
    data: () => incompleteDraft(),
  };
  const firestore = {
    collection(name) {
      return {
        doc(id) {
          if (name === '_formularios_public_ids') {
            assert.equal(id, PUBLIC_ID);
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({ formId: FORM_ID }),
                };
              },
            };
          }
          assert.equal(name, 'formularios');
          assert.equal(id, FORM_ID);
          return { get: async () => formDocument };
        },
      };
    },
    async runTransaction(operation) {
      return operation({
        async get(ref) {
          if (ref === responseRef) return { exists: false };
          assert.equal(ref, formRef);
          return formDocument;
        },
        create() {
          writes += 1;
        },
        update() {
          writes += 1;
        },
      });
    },
  };
  firebaseAdmin.obterFirestoreAdmin = () => firestore;

  await assert.rejects(
    registrarRespostaFormulario(
      PUBLIC_ID,
      { schemaVersion: 1, answers: {} },
      'request-key-1234',
    ),
    (error) => {
      assert.ok(error instanceof FormularioPublicoServiceError);
      assert.equal(error.code, 'FORM_CLOSED');
      assert.equal(error.status, 409);
      return true;
    },
  );
  assert.equal(writes, 0);
});
