import test from 'node:test';
import assert from 'node:assert/strict';
import { match, jobData, profileData } from '../server/domain.js';
const profile = profileData('candidate', {
  phone: '81999999999',
  city: 'Olinda',
  school: 'Médio',
  availability: 'Manhã',
  occupation: 'Atendente',
  experience: 2,
  hard: 'Caixa, CAIXA',
  soft: 'Comunicação',
});
const job = {
  ...jobData({
    city: 'OLINDA',
    school: 'Médio',
    schedule: 'Manhã',
    required: 'COMUNICACAO',
    hard: 'Caixa',
    soft: 'Comunicação',
    desiredExperience: 2,
    description: 'Atender o público',
  }),
  title: 'Atendente',
};

test('pontua os quatro critérios e normaliza tags', () => {
  assert.equal(profile.hard.length, 1);
  assert.deepEqual(match(profile, job), {
    score: 100,
    parts: { experience: 40, skills: 25, region: 25, availability: 10 },
  });
});
test('aplica os requisitos eliminatórios antes da pontuação', () => {
  for (const change of [
    { school: 'Superior' },
    { required: ['Inventário'] },
    { city: 'Recife', locationRequired: true },
  ]) {
    assert.equal(match(profile, { ...job, ...change }), null);
  }
});
test('distingue experiência na função e competências parciais', () => {
  const result = match(profile, {
    ...job,
    title: 'Supervisor',
    hard: ['Inventário'],
    city: 'Recife',
    schedule: 'Noite',
  });
  assert.deepEqual(result.parts, {
    experience: 0,
    skills: 13,
    region: 17,
    availability: 4,
  });
  assert.equal(result.score, 34);
});
