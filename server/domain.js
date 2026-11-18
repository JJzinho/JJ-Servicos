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
  const raw = field(value ?? '', 'competências', 1200, false)
    .split(',')
    .map((s) => s.trim())
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
export function profileData(role, body) {
  const city = field(body.city, 'cidade');
  if (role === 'company')
    return {
      city,
      sector: field(body.sector, 'setor'),
      contact: field(body.contact, 'responsável'),
    };
  return {
    city,
    phone: field(body.phone, 'telefone', 35),
    school: choice(body.school, schools, 'formação'),
    experience: years(body.experience),
    experienceText: field(
      body.experienceText || '',
      'experiências',
      2400,
      false,
    ),
    occupation: field(body.occupation, 'função de interesse'),
    availability: choice(body.availability, shifts, 'disponibilidade'),
    hard: tags(body.hard),
    soft: tags(body.soft),
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
export function match(profile, job) {
  if (
    !profile.city ||
    schools.indexOf(profile.school) < schools.indexOf(job.school)
  )
    return null;
  const skills = new Set([...profile.hard, ...profile.soft].map(normalize));
  const city = normalize(profile.city),
    target = normalize(job.city);
  if (
    (job.locationRequired && city !== target) ||
    job.required.some((t) => !skills.has(normalize(t)))
  )
    return null;
  const desired = [...new Set([...job.hard, ...job.soft].map(normalize))];
  const parts = {
    experience: job.desiredExperience
      ? Math.min(
          40,
          Math.round(
            (40 *
              (normalize(profile.occupation) === normalize(job.title)
                ? profile.experience
                : 0)) /
              job.desiredExperience,
          ),
        )
      : 40,
    skills: desired.length
      ? Math.round(
          (25 * desired.filter((t) => skills.has(t)).length) / desired.length,
        )
      : 25,
    region:
      city === target
        ? 25
        : metro.includes(city) && metro.includes(target)
          ? 17
          : 5,
    availability: [job.schedule, 'Integral', 'Flexível'].includes(
      profile.availability,
    )
      ? 10
      : 4,
  };
  return { parts, score: Object.values(parts).reduce((sum, n) => sum + n, 0) };
}
