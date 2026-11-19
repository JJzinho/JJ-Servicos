import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveTerms,
  interpretFit,
  suggestTerms,
  GeminiUnavailable,
} from '../server/gemini.js';
import { match } from '../server/domain.js';

const job = {
  title: 'Operador de caixa',
  details: {
    hard: ['ponto de venda'],
    soft: [],
    desiredExperience: 1,
    description: 'descrição privada',
    city: 'Olinda',
    school: 'Médio',
    required: ['Atendimento'],
    schedule: 'Manhã',
  },
};
const profile = {
  occupation: 'Caixa',
  experience: 1,
  school: 'Médio',
  city: 'Olinda',
  hard: ['Atendimento', 'PDV'],
  soft: [],
  availability: 'Manhã',
};
const rows = [
  { index: 0, aliases: ['Caixa'] },
  { index: 1, aliases: ['PDV', 'pdv', 'Ponto de venda'] },
];
const packet = (result) =>
  Response.json({
    candidates: [
      {
        finishReason: 'STOP',
        content: { parts: [{ text: JSON.stringify(result) }] },
      },
    ],
  });

test('envia ao Google apenas o vocabulário da vaga e exige aprovação para a nota', async () => {
  const draft = await suggestTerms(job, {
    apiKey: 'chave-de-teste',
    send: async (url, options) => {
      assert.ok(!url.includes('chave-de-teste'));
      assert.equal(options.headers['x-goog-api-key'], 'chave-de-teste');
      const body = JSON.parse(options.body);
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), [
        { index: 0, type: 'cargo', term: job.title },
        { index: 1, type: 'competência', term: 'ponto de venda' },
      ]);
      return packet(rows);
    },
  });
  assert.equal(draft.suggestions.length, 2);
  const vacancy = { ...job.details, title: job.title };
  assert.equal(match(profile, vacancy).score, 35);
  const review = approveTerms(draft, {
    version: draft.version,
    selected: [0, 1],
  });
  const approved = review.approved.map((i) => review.suggestions[i]);
  const result = match(profile, vacancy, approved);
  assert.equal(result.score, 100);
  assert.deepEqual(result.evidence, approved);
  assert.equal(
    match(profile, { ...vacancy, required: ['ponto de venda'] }, approved),
    null,
  );
  assert.throws(
    () => approveTerms(review, { version: draft.version, selected: [] }),
    { status: 409 },
  );
  assert.throws(
    () => approveTerms(review, { version: review.version, selected: [42] }),
    { status: 400 },
  );
});
test('chave ausente, cota, modelo inválido, JSON incompleto e índices inválidos permitem seguir pela triagem local', async () => {
  for (const options of [
    { apiKey: '' },
    { apiKey: 'fake', model: '../' },
    { send: async () => new Response(null, { status: 429 }) },
    { send: async () => new Response(null, { status: 403 }) },
    { send: async () => Response.json({ candidates: [] }) },
    { send: async () => packet([{ index: 24, aliases: ['PDV'] }]) },
    {
      send: async () => {
        throw new Error('timeout');
      },
    },
  ])
    await assert.rejects(
      suggestTerms(job, { apiKey: 'fake', ...options }),
      GeminiUnavailable,
    );
});

test('análise conjunta transmite somente os indicadores profissionais e a distância já calculada', async () => {
  const answer = {
    competencias: 'PDV atendido.',
    proximidade: 'Distância aproximada de 12 km.',
  };
  const actual = await interpretFit(
    {
      covered: ['pdv'],
      missing: [],
      km: 12,
      cpf: 'privado',
      address: 'privado',
    },
    {
      apiKey: 'fake',
      send: async (url, options) => {
        assert.deepEqual(
          JSON.parse(JSON.parse(options.body).contents[0].parts[0].text),
          {
            competenciasObrigatoriasAtendidas: [],
            competenciasDesejaveisAtendidas: ['pdv'],
            competenciasDesejaveisNaoIdentificadas: [],
            distanciaAproximadaEmLinhaRetaKm: 12,
          },
        );
        return packet(answer);
      },
    },
  );
  assert.deepEqual(actual, answer);
});
