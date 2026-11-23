import { distanceKm } from './address.js';
import { sectors } from '../public/ui/setores.js';
export const schools = ['Fundamental', 'Médio', 'Técnico', 'Superior'];
export const shifts = ['Integral', 'Manhã', 'Tarde', 'Noite', 'Flexível'];
export const stages = [
  'Pré-selecionado',
  'Entrevista',
  'Contratado',
  'Não selecionado',
];
const metro = [
  'recife',
  'olinda',
  'jaboatao dos guararapes',
  'paulista',
  'camaragibe',
];
export const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export function field(value, label, max = 120, required = true) {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  ) {
    fail(400, 'Confira o campo ' + label + '.');
  }
  return value.trim();
}
export function choice(value, values, label) {
  if (!values.includes(value))
    fail(400, 'Escolha uma opção válida em ' + label + '.');
  return value;
}
function tags(value) {
  const entries = Array.isArray(value)
    ? value
    : field(value ?? '', 'competências', 2400, false).split(',');
  const raw = entries
    .map((v) => field(v, 'competência', 80, false))
    .filter(Boolean);
  if (raw.length > 30 || raw.some((t) => t.length > 80))
    fail(400, 'Use até 30 competências com até 80 caracteres cada.');
  return [...new Map(raw.map((t) => [normalize(t), t])).values()];
}
function years(value) {
  const number = Number(value);
  if (
    value === '' ||
    value == null ||
    !Number.isInteger(number) ||
    number < 0 ||
    number > 80
  )
    fail(400, 'Informe a experiência em anos, de 0 a 80.');
  return number;
}
const states =
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(
    ' ',
  );
export function addressData(body) {
  const cep = field(body?.cep, 'CEP', 9).replace(/-/g, '');
  if (!/^\d{8}$/.test(cep)) fail(400, 'Informe um CEP com oito dígitos.');
  return {
    cep,
    street: field(body.street, 'logradouro', 180),
    number: field(body.number, 'número', 20),
    complement: field(body.complement ?? '', 'complemento', 120, false),
    district: field(body.district, 'bairro'),
    city: field(body.city, 'cidade'),
    state: choice(body.state, states, 'UF'),
  };
}
function cpfNumber(value) {
  const digits = field(value, 'CPF', 14).replace(/[.\-]/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1+$/.test(digits))
    fail(400, 'Confira o CPF informado.');
  for (const length of [9, 10]) {
    const sum = [...digits.slice(0, length)].reduce(
      (total, n, i) => total + Number(n) * (length + 1 - i),
      0,
    );
    if (((sum * 10) % 11) % 10 !== Number(digits[length]))
      fail(400, 'Confira os dígitos do CPF.');
  }
  return digits;
}
export function professionalRoles(p) {
  return (
    p.roles ??
    (p.occupation
      ? [
          {
            title: p.occupation,
            years: p.experience,
            summary: p.experienceText || '',
          },
        ]
      : [])
  );
}
function cnpjNumber(value) {
  const number = field(value, 'CNPJ', 18).toUpperCase().replace(/[./-]/g, '');
  if (!/^[A-Z0-9]{12}\d{2}$/.test(number) || /^(\d)\1+$/.test(number))
    fail(400, 'Confira o CNPJ informado.');
  for (const length of [12, 13]) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const weight = 2 + (length - 1 - i) % 8;
      sum += (number.charCodeAt(i) - 48) * weight;
    }
    const remainder = sum % 11;
    if (Number(number[length]) !== (remainder < 2 ? 0 : 11 - remainder))
      fail(400, 'Confira os dígitos do CNPJ.');
  }
  return number;
}
export function profileData(role, body, previousSector) {
  const address = addressData(body.address);
  const phone = field(body.phone, 'telefone', 35);
  if (
    !/^\+?[\d\s()-]+$/.test(phone) ||
    !/^\d{10,13}$/.test(phone.replace(/\D/g, ''))
  )
    fail(400, 'Informe o telefone com DDD.');
  const common = { complete: true, city: address.city, address, phone };
  if (role === 'company')
    return {
      ...common,
      cnpj: cnpjNumber(body.cnpj),
      description: field(body.description ?? '', 'descrição da empresa', 2400, false),
      sector: choice(field(body.sector, 'setor'), [...sectors, previousSector], 'setor de atuação'),
      ...(body.sector?.trim() === 'Outro' && { otherSector: field(body.otherSector, 'outro setor de atuação') }),
      contact: field(body.contact, 'responsável'),
    };
  if (
    !Array.isArray(body.roles) ||
    !body.roles.length ||
    body.roles.length > 30
  )
    fail(400, 'Selecione de uma a 30 funções.');
  const roles = body.roles.map((r) => ({
    title: field(r?.title, 'função'),
    years: years(r.years),
    summary: field(r.summary, 'resumo da função', 2400),
  }));
  if (new Set(roles.map((r) => normalize(r.title))).size !== roles.length)
    fail(400, 'Cada função deve aparecer uma vez.');
  const hard = tags(body.hard),
    soft = tags(body.soft);
  if (!hard.length && !soft.length)
    fail(400, 'Marque ao menos uma competência.');
  return {
    ...common,
    cpf: cpfNumber(body.cpf),
    roles,
    hard,
    soft,
    school: choice(body.school, schools, 'formação'),
    availability: choice(body.availability, shifts, 'disponibilidade'),
  };
}
export function companySettingsData(body) {
  const raw = body?.employeeCount;
  let employeeCount = null;
  if (raw != null && raw !== '') {
    if (!['number', 'string'].includes(typeof raw) || !/^\d+$/.test(String(raw)) || !Number.isSafeInteger(Number(raw)))
      fail(400, 'Informe uma quantidade inteira de funcionários, a partir de zero.');
    employeeCount = Number(raw);
  }
  return {
    employeeCount,
    departments: field(body?.departments ?? '', 'setores internos', 2400, false),
    notes: field(body?.notes ?? '', 'informações adicionais', 2400, false),
  };
}
export function publicProfile(p) {
  const { city, phone, school, availability, hard, soft } = p;
  return {
    city,
    phone,
    school,
    availability,
    hard,
    soft,
    roles: professionalRoles(p),
  };
}
export function jobData(body) {
  return {
    description: field(body.description, 'descrição', 4000),
    city: field(body.city, 'cidade'),
    school: choice(body.school, schools, 'escolaridade mínima'),
    schedule: choice(body.schedule, shifts, 'jornada'),
    required: tags(body.required),
    hard: tags(body.hard),
    soft: tags(body.soft),
    desiredExperience: years(body.desiredExperience),
    locationRequired: body.locationRequired === true,
  };
}
export function match(profile, job, approved = []) {
  if (
    !profile.city ||
    schools.indexOf(profile.school) < schools.indexOf(job.school)
  )
    return null;
  const skills = new Set([...profile.hard, ...profile.soft].map(normalize));
  const city = normalize(profile.city),
    target = normalize(job.city);
  if (
    (job.locationRequired &&
      (city !== target ||
        (profile.address?.state &&
          job.address?.state &&
          profile.address.state !== job.address.state))) ||
    job.required.some((t) => !skills.has(normalize(t)))
  )
    return null;
  const desired = [...new Set([...job.hard, ...job.soft].map(normalize))];
  const evidence = [];
  function equivalent(type, target, declared) {
    const direct = declared.includes(normalize(target));
    if (direct) return true;
    const found = approved.find(
      (item) =>
        item.type === type &&
        normalize(item.term) === normalize(target) &&
        declared.includes(normalize(item.alias)),
    );
    if (found) evidence.push(found);
    return Boolean(found);
  }
  const roles = professionalRoles(profile)
    .slice()
    .sort((a, b) => b.years - a.years);
  const role =
    job.desiredExperience &&
    roles.find(
      (r) =>
        r.years > 0 && equivalent('cargo', job.title, [normalize(r.title)]),
    );
  const experience = role ? role.years : 0;
  const skillNames = [...skills];
  const covered = desired.filter((term) =>
    equivalent('competência', term, skillNames),
  );
  const km = distanceKm(profile.address?.point, job.address?.point);
  const sameState =
    !profile.address?.state ||
    !job.address?.state ||
    profile.address.state === job.address.state;
  let region;
  if (km === null) {
    region = 5;
    if (sameState && metro.includes(city) && metro.includes(target))
      region = 17;
    if (sameState && city === target) region = 25;
  } else {
    const distances = [
      [5, 25],
      [15, 20],
      [30, 15],
      [Infinity, 5],
    ];
    region = distances.find(([max]) => km <= max)[1];
  }
  const parts = {
    experience: job.desiredExperience
      ? Math.min(40, Math.round((40 * experience) / job.desiredExperience))
      : 40,
    skills: desired.length
      ? Math.round((25 * covered.length) / desired.length)
      : 25,
    region,
    availability: [job.schedule, 'Integral', 'Flexível'].includes(
      profile.availability,
    )
      ? 10
      : 4,
  };
  return {
    parts,
    facts: {
      km,
      required: job.required,
      covered,
      missing: desired.filter((t) => !covered.includes(t)),
    },
    ...(evidence.length ? { evidence } : {}),
    score: Object.values(parts).reduce((sum, n) => sum + n, 0),
  };
}
