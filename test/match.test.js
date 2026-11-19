import test from 'node:test';
import assert from 'node:assert/strict';
import { match, jobData, profileData, companySettingsData } from '../server/domain.js';
const profile = profileData('candidate', {
  phone: '81999999999',
  city: 'Olinda',
  school: 'Médio',
  availability: 'Manhã',
  cpf: '529.982.247-25',
  address: {
    cep: '53000000',
    state: 'PE',
    city: 'Olinda',
    street: 'Rua Teste',
    district: 'Bairro',
    number: '1',
  },
  roles: [
    { title: 'Auxiliar', years: 4, summary: 'Organização.' },
    { title: 'Atendente', years: 2, summary: 'Atendimento.' },
  ],
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

test('cadastro da empresa valida CNPJ, setor e contato e aceita descrição opcional', () => {
  const body = {
    address: profile.address, sector: 'Comércio', contact: 'Ana Silva',
    phone: '(81) 99999-9999', cnpj: '12.ABC.345/01DE-35',
  };
  const saved = profileData('company', body);
  assert.equal(saved.cnpj, '12ABC34501DE35');
  assert.equal(saved.description, '');
  assert.equal(saved.contact, body.contact);
  assert.equal(saved.phone, body.phone);
  assert.throws(() => profileData('company', { ...body, sector: 'Outro', otherSector: '  ' }), { status: 400 });
  assert.equal(profileData('company', { ...body, sector: 'Outro', otherSector: 'Artesanato' }).otherSector, 'Artesanato');
  assert.equal(profileData('company', { ...body, otherSector: 'Artesanato' }).otherSector, undefined);
  assert.equal(profileData('company', { ...body, cnpj: '04.252.011/0001-10', description: 'Loja de roupas' }).description, 'Loja de roupas');
  for (const change of [{ cnpj: '' }, { cnpj: '12ABC34501DE36' }, { sector: '' }, { sector: 'Teste' }, { contact: '' }, { phone: '123' }]) {
    assert.throws(() => profileData('company', { ...body, ...change }), { status: 400 });
  }
  assert.equal(profileData('company', { ...body, sector: 'Setor antigo' }, 'Setor antigo').sector, 'Setor antigo');
});

test('configurações aceitam campos opcionais e quantidade inteira de funcionários', () => {
  assert.deepEqual(companySettingsData({}), { employeeCount: null, departments: '', notes: '' });
  assert.deepEqual(companySettingsData({ employeeCount: '0', departments: ' Vendas ', notes: 'Equipe local' }), {
    employeeCount: 0, departments: 'Vendas', notes: 'Equipe local',
  });
  for (const employeeCount of ['-1', '1.5', 'abc', '99999999999999999'])
    assert.throws(() => companySettingsData({ employeeCount }), { status: 400 });
});

test('pontua os quatro critérios e normaliza tags', () => {
  assert.equal(profile.hard.length, 1);
  assert.deepEqual(match(profile, job), {
    score: 100,
    facts: {
      km: null,
      required: ['COMUNICACAO'],
      covered: ['caixa', 'comunicacao'],
      missing: [],
    },
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

test('CPF, endereço e experiência de cada função são obrigatórios', () => {
  for (const change of [
    { cpf: '111.111.111-11' },
    { cpf: '52998224726' },
    { roles: [] },
    { roles: [{ title: 'Caixa', years: 2, summary: '' }] },
    { address: { ...profile.address, number: '' } },
    { hard: [], soft: [] },
  ]) {
    assert.throws(() => profileData('candidate', { ...profile, ...change }), {
      status: 400,
    });
  }
  assert.equal(profile.cpf, '52998224725');
});
test('distância entre CEPs influencia a nota e coordenadas ausentes não produzem km', () => {
  const a = {
    ...profile,
    address: { ...profile.address, point: { lat: -8, lon: -35 } },
  };
  const b = {
    ...job,
    address: { state: 'PE', point: { lat: -8.1, lon: -35 } },
  };
  assert.equal(match(a, b).facts.km, 11.1);
  assert.equal(match(a, b).parts.region, 20);
  assert.equal(match(a, job).facts.km, null);
  assert.equal(
    match(a, {
      ...b,
      address: { state: 'PB', point: null },
      locationRequired: true,
    }),
    null,
  );
});
