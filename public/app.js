import {
  esc,
  input,
  area,
  select,
  number,
  catalog,
  checklist,
  referenceRoles,
  collectRoles,
  locationFields,
  readAddress,
  values,
  collectedSkills,
  bindFormControls,
} from './ui/formulario.js';
import { sectors } from './ui/setores.js';
const paths = {
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
  building:
    '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 21v-5h8v5M8 8h.01M16 8h.01M8 12h.01M16 12h.01"/>',
  'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5m6 6-6-6 6-6"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 7h18"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-16a4 4 0 0 1 0 8m6 8v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  'map-pin':
    '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  layout:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  shield:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  inbox:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7 7 0 0 0 0-3l2-1.5-2-3.5-2.3.9a7 7 0 0 0-2.6-1.5L13.7 2h-3.4l-.4 2.9a7 7 0 0 0-2.6 1.5L5 5.5 3 9l2 1.5a7 7 0 0 0 0 3L3 15l2 3.5 2.3-.9a7 7 0 0 0 2.6 1.5l.4 2.9h3.4l.4-2.9a7 7 0 0 0 2.6-1.5l2.3.9L21 15z"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
};
const root = document.querySelector('#app');
const schools = ['Fundamental', 'Médio', 'Técnico', 'Superior'];
const shifts = ['Integral', 'Manhã', 'Tarde', 'Noite', 'Flexível'];
const stages = [
  'Pré-selecionado',
  'Entrevista',
  'Contratado',
  'Não selecionado',
];
const labels = {
  candidate: 'Candidato',
  company: 'Empresa',
  admin: 'Equipe JJ',
};
const statusName = {
  triagem: 'Em triagem',
  sent: 'Lista enviada',
  closed: 'Encerrada',
};
const icon = (name) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
const brand =
  '<div class="brand"><img src="/assets/favicon.svg" width="38" height="38" alt=""><span>JJ Serviços</span></div>';
const route = () => location.hash.slice(1) || 'inicio';
const go = (path) => {
  if (route() === path) render();
  else location.hash = path;
};
let user = null,
  access = 'candidate',
  revision = 0,
  toastTimer;
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.textContent = '';
  }, 3500);
}
async function api(path, method = 'GET', data) {
  const options = { method };
  if (method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data ?? {});
  }
  let response;
  try {
    response = await fetch('/api' + path, options);
  } catch {
    throw new Error('Não foi possível acessar o servidor. Confira a conexão.');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `A API não retornou os dados esperados (HTTP ${response.status}). Confira a publicação do servidor.`,
    );
  }
  if (!response.ok) {
    if (result.code === 'PROFILE_INCOMPLETE' && user) {
      user.profile.complete = false;
      go('perfil');
    }
    if (response.status === 401 && user) {
      user = null;
      go('entrar');
    }
    throw Object.assign(new Error(result.error), { status: response.status });
  }
  return result;
}
const note = '<p class="error" role="alert"></p>';
const submit = (label) =>
  note +
  `<button class="primary" type="submit">${label} ${icon('arrow-right')}</button>`;
const empty = (title, text) =>
  `<div class="empty">${icon('inbox')}<strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
const date = (value) => new Date(value).toLocaleDateString('pt-BR');
const link = (path, text, kind = 'outline') =>
  `<a class="${kind}" href="#${path}">${text}</a>`;
const badge = (status) =>
  `<span class="badge ${status}">${statusName[status]}</span>`;
function authPage() {
  const register = route() === 'cadastro';
  if (register && access === 'admin') access = 'candidate';
  const team = access === 'admin';
  const roles = ['candidate', 'company']
    .map(
      (role) =>
        `<button type="button" class="role" data-role="${role}" aria-pressed="${access === role}">${icon(role === 'candidate' ? 'user' : 'building')}${labels[role]}</button>`,
    )
    .join('');
  document.title = (register ? 'Criar conta' : 'Entrar') + ' · JJ Serviços';
  return `<header class="top">${brand}<span class="portal">Portal de recrutamento</span></header>
  <main class="auth-wrap"><section class="auth-card"><div class="auth-band" aria-hidden="true"><i></i><b></b></div>
  <div class="auth-content"><h1>${register ? 'Criar conta' : team ? 'Acesso da equipe' : 'Entrar na conta'}</h1>
  ${register ? `<fieldset class="account-type"><legend>Tipo de conta</legend><div class="roles">${roles}</div></fieldset>` : `<p>${team ? 'Entre com seu acesso de triagem.' : 'Selecione seu perfil para acessar o painel.'}</p>${team ? '' : `<div class="roles" aria-label="Tipo de acesso">${roles}</div>`}`}
  <form id="auth">${register ? input(access === 'company' ? 'Nome da empresa' : 'Nome completo', 'name', '', { extra: access === 'company' ? 'autocomplete="organization"' : 'autocomplete="name"' }) : ''}
  ${input('E-mail', 'email', '', { type: 'email', max: 254, extra: 'autocomplete="email" placeholder="seu@email.com"' })}
  ${input('Senha', 'password', '', { type: 'password', max: 128, extra: register ? 'minlength="8" autocomplete="new-password"' : 'autocomplete="current-password"', hint: register ? 'Use ao menos 8 caracteres.' : '' })}
  ${submit(register ? 'Criar conta' : 'Entrar')}</form>
  ${team ? '' : `<div class="auth-switch">${register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} ${link(register ? 'entrar' : 'cadastro', register ? 'Entrar' : 'Cadastre-se', 'inline')}</div>`}
  </div></section><button class="team-link" data-role="${team ? 'candidate' : 'admin'}">${icon(team ? 'arrow-left' : 'shield')}${team ? 'Voltar ao login' : 'Acesso da equipe JJ'}</button></main>`;
}
const menu = {
  candidate: [
    ['inicio', 'Painel', 'layout'],
    ['perfil', 'Meu perfil', 'user'],
    ['vagas', 'Vagas', 'briefcase'],
    ['processos', 'Meus processos', 'file'],
    ['avisos', 'Avisos', 'bell'],
  ],
  company: [
    ['inicio', 'Painel', 'layout'],
    ['vagas', 'Minhas vagas', 'briefcase'],
    ['nova', 'Abrir vaga', 'plus'],
    ['perfil', 'Minha empresa', 'building'],
    ['configuracoes', 'Configurações da empresa', 'layout'],
  ],
  admin: [
    ['inicio', 'Painel', 'layout'],
    ['vagas', 'Triagem de vagas', 'briefcase'],
  ],
};
function shell(content) {
  const path = route().split('/')[0];
  return `<header class="top">${brand}<div class="account"><span>${esc(user.name)} · ${labels[user.role]}</span><button class="outline" data-action="logout">${icon('logout')} Sair</button></div></header>
  <div class="workspace"><nav aria-label="Navegação principal">${(user.role === 'admin' || user.profile.complete ? menu[user.role] : menu[user.role].filter(([p]) => p === 'perfil')).map(([p, t, i]) => `<a href="#${p}" ${path === p || (path === 'vaga' && p === 'vagas') ? 'aria-current="page"' : ''}>${icon(i)}${t}</a>`).join('')}</nav><main class="panel">${content}</main></div>`;
}
function heading(title, desc = '', action = '') {
  return `<div class="heading"><div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${action}</div>`;
}
function profilePage() {
  const p = user.profile,
    company = user.role === 'company';
  const roles =
    p.roles ??
    (p.occupation
      ? [
          {
            title: p.occupation,
            years: p.experience,
            summary: p.experienceText,
          },
        ]
      : []);
  const phoneField = input('Telefone de contato', 'phone', p.phone, {
    type: 'tel', max: 35, extra: 'autocomplete="tel" placeholder="(81) 99999-9999"',
  });
  const customSector = p.sector === 'Outro' ? p.otherSector : p.sector && !sectors.includes(p.sector) ? p.sector : '';
  const selectedSector = customSector ? 'Outro' : p.sector;
  const fields = company
    ? input('CNPJ', 'cnpj', p.cnpj, { max: 18, extra: 'autocapitalize="characters" spellcheck="false" placeholder="00.000.000/0001-00"' }) +
      `<label>Setor de atuação<select name="sector" required><option value="">Selecione um setor</option>${sectors.map(s => `<option ${s === selectedSector ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <div data-other-sector ${selectedSector === 'Outro' ? '' : 'hidden'}>${input('Qual é o setor de atuação?', 'otherSector', customSector, { required: selectedSector === 'Outro', extra: selectedSector === 'Outro' ? '' : 'disabled' })}</div>`
    : input('CPF', 'cpf', p.cpf, {
        max: 32,
        extra: 'inputmode="numeric" placeholder="000.000.000-00"',
      }) +
      phoneField;
  return (
    heading(
      company ? 'Minha empresa' : 'Meu perfil',
      p.complete
        ? esc(user.email)
        : 'Conclua o cadastro para acessar o painel.',
    ) +
    `<form id="profile"><section class="sheet profile-section"><h2>${company ? 'Dados da empresa' : 'Dados pessoais'}</h2><div class="form-grid"><div class="profile-name">${input(company ? 'Nome da empresa' : 'Nome completo', 'name', user.name)}</div>${fields}</div>
    ${company ? area('Descrição da empresa (opcional)', 'description', p.description, 2400) : ''}
    ${locationFields(p.address || { city: p.city })}</section>
    ${
      company
        ? `<section class="sheet profile-section"><h2>Dados do empresário</h2><div class="form-grid">${input('Nome completo', 'contact', p.contact, { extra: 'autocomplete="name"' })}${phoneField}</div></section>`
        : `<section class="sheet profile-section"><h2>Perfil profissional</h2><div class="form-grid">${select('Formação', 'school', schools, p.school)}${select('Disponibilidade', 'availability', shifts, p.availability)}</div>` + referenceRoles(roles) +
          '</section><section class="sheet profile-section"><h2>Competências</h2>' +
          checklist('Competências técnicas', 'hard', catalog.hard, p.hard) +
          checklist(
            'Competências comportamentais',
            'soft',
            catalog.soft,
            p.soft,
          ) +
          `</section><section class="sheet profile-section"><h2>Autorização para triagem</h2><label class="check"><input type="checkbox" name="consent" ${user.consent_at ? 'checked' : ''}><span>Autorizo a JJ Serviços a incluir meu perfil na triagem e compartilhar meus dados profissionais e de contato com as empresas para cujas vagas eu for selecionado. A análise com IA usa competências da vaga e a distância aproximada entre os CEPs.</span></label></section>`
    }
    ${submit('Salvar cadastro')}</form>${company ? '' : `<details class="danger"><summary>Excluir minha conta</summary><form id="delete"><p>A exclusão remove seu perfil, suas participações e seus avisos.</p>${input('Confirme sua senha', 'password', '', { type: 'password', max: 128 })}${submit('Excluir definitivamente')}</form></details>`}`
  );
}
function companySettings() {
  const settings = user.profile.settings || {};
  return heading('Configurações da empresa') +
    `<form id="company-settings" class="sheet profile-section"><h2>Estrutura da empresa</h2>
    ${input('Quantidade de funcionários (opcional)', 'employeeCount', settings.employeeCount, { type: 'number', required: false, extra: 'min="0" step="1" inputmode="numeric"' })}
    ${area('Setores internos (opcional)', 'departments', settings.departments, 2400)}
    ${area('Informações adicionais (opcional)', 'notes', settings.notes, 2400)}
    ${submit('Salvar configurações')}</form>`;
}
function newJob() {
  if (!user.profile.city)
    return (
      heading('Abrir vaga') +
      empty(
        'Complete o cadastro da empresa',
        'Informe a cidade, o setor e o responsável pela vaga.',
      ) +
      link('perfil', 'Completar cadastro')
    );
  return (
    heading(
      'Abrir vaga',
      'Defina os requisitos que a equipe usará na triagem.',
    ) +
    `<form id="new-job" class="sheet">
    ${input('Título da vaga', 'title')}${area('Descrição da função', 'description', '', 4000, true)}<div class="form-grid">
    ${select('Jornada', 'schedule', shifts)}
    ${select('Escolaridade mínima', 'school', schools)}${number('Anos de experiência desejáveis na função', 'desiredExperience')}</div>
    ${locationFields(user.profile.address)}
    <label class="check"><input type="checkbox" name="locationRequired">Exigir que o candidato resida na mesma cidade</label>
    ${checklist('Competências obrigatórias', 'required', [...catalog.hard, ...catalog.soft])}${checklist('Competências técnicas desejáveis', 'hard', catalog.hard)}${checklist('Competências comportamentais desejáveis', 'soft', catalog.soft)}
    ${submit('Abrir vaga para triagem')}</form>`
  );
}
function jobList(jobs, blank = 'As vagas aparecerão aqui.') {
  if (!jobs.length) return empty('Nenhuma vaga por aqui', blank);
  return (
    '<div class="list">' +
    jobs
      .map(
        (
          j,
        ) => `<a class="job-row" href="#vaga/${j.id}"><span class="tile">${icon('briefcase')}</span>
    <div class="row-main"><strong>${esc(j.title)}</strong><small>${esc(j.company)} · ${esc(j.details.city)}</small></div>
    ${j.stage ? `<span class="stage">${esc(j.stage)}</span>` : ''}${badge(j.status)}${icon('chevron-right')}</a>`,
      )
      .join('') +
    '</div>'
  );
}
function overview(jobs) {
  const candidate = user.role === 'candidate',
    company = user.role === 'company';
  const pending = jobs.filter((j) => j.status === 'triagem').length;
  const active = jobs.filter((j) => j.status !== 'closed').length;
  const processes = jobs.filter((j) => j.stage || j.interested);
  const stats = candidate
    ? [
        ['Vagas abertas', active],
        ['Meus processos', processes.length],
        [
          'Entrevistas',
          processes.filter((j) => j.stage === 'Entrevista').length,
        ],
      ]
    : [
        ['Total de vagas', jobs.length],
        ['Em triagem', pending],
        ['Listas enviadas', jobs.filter((j) => j.status === 'sent').length],
      ];
  return (
    heading(
      candidate
        ? 'Painel do candidato'
        : company
          ? 'Painel da empresa'
          : 'Painel da equipe',
      esc(user.name),
      company ? link('nova', icon('plus') + ' Abrir vaga', 'primary') : '',
    ) +
    ((company && !user.profile.city) || (candidate && !user.consent_at)
      ? `<div class="callout"><div><strong>${company ? 'Complete o cadastro da empresa' : 'Ative seu perfil para a triagem'}</strong><p>${company ? 'Informe os dados da empresa para abrir sua primeira vaga.' : 'Revise seus dados e autorize o envio do perfil às empresas.'}</p></div>${link('perfil', 'Revisar cadastro', 'inline')}</div>`
      : '') +
    `<div class="stats">${stats.map(([t, n]) => `<div><small>${t}</small><strong>${n}</strong></div>`).join('')}</div>
    <div class="section-title"><h2>${candidate ? 'Meus processos' : company ? 'Minhas vagas' : 'Fila de triagem'}</h2>${link(candidate ? 'processos' : 'vagas', 'Ver todas', 'inline')}</div>` +
    jobList(
      (candidate
        ? processes
        : company
          ? jobs
          : jobs.filter((j) => j.status === 'triagem')
      ).slice(0, 5),
    )
  );
}
function aiPanel(job) {
  if (
    !job.details.desiredExperience &&
    !job.details.hard.length &&
    !job.details.soft.length
  )
    return '';
  const heading = '<h3>Equivalências com Gemini</h3>';
  const state = job.ai_match;
  if (!state)
    return `<form class="sheet" id="ai-generate">${heading}<p>O Gemini consulta o vocabulário da vaga. Revise os sinônimos sugeridos antes de calcular as recomendações.</p>${submit('Consultar Gemini')}</form>`;
  if (!state.suggestions.length)
    return `<div class="sheet">${heading}<p>O Gemini não encontrou equivalências claras. Revise os perfis pela pontuação original.</p></div>`;
  const choices = state.suggestions
    .map(
      (s, i) =>
        `<label class="check"><input type="checkbox" name="selected" value="${i}" ${state.approved.includes(i) ? 'checked' : ''}><span>${esc(s.term)} ⇄ ${esc(s.alias)} <small>(${esc(s.type)})</small></span></label>`,
    )
    .join('');
  return `<form class="sheet" id="ai-terms" data-version="${esc(state.version)}">${heading}<p>Marque os termos que têm o mesmo significado nesta vaga. Ao aplicar, os perfis serão reordenados e os cinco primeiros ficarão marcados para sua revisão.</p>${choices}${submit('Aplicar e recomendar perfis')}</form>`;
}
function matchEvidence(evidence) {
  if (!evidence?.length) return '';
  return `<div><strong>Equivalências que contribuíram para a nota</strong><ul>${evidence.map(({ term, alias }) => `<li>Vaga: ${esc(term)} · Perfil: ${esc(alias)}</li>`).join('')}</ul></div>`;
}
function cards(list, job, review) {
  if (!list.length)
    return empty(
      review ? 'Nenhum perfil compatível' : 'A lista está vazia',
      review
        ? 'A triagem considera os perfis autorizados que atendem aos requisitos obrigatórios.'
        : 'Os perfis disponíveis aparecerão após a revisão da equipe.',
    );
  return list
    .map(
      (
        c,
        index,
      ) => `<article class="person"><div class="person-head"><div><h3>${esc(c.name)}</h3><small>${esc(c.profile.city)}</small></div><span class="score">${c.score}/100</span></div>
    <p>${esc(c.profile.school)} · ${esc(c.profile.availability)}</p>
    <div class="tags">${[...c.profile.hard, ...c.profile.soft].map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    ${matchEvidence(c.evidence)}
    ${c.profile.roles.map((r) => `<div><strong>${esc(r.title)} · ${esc(r.years)} ano(s)</strong><p class="prose">${esc(r.summary)}</p></div>`).join('')}
    ${
      c.facts
        ? `<p><strong>Distância até a vaga</strong> · ${c.facts.km == null ? 'Sem coordenadas suficientes' : Number(c.facts.km).toLocaleString('pt-BR') + ' km em linha reta (aprox. pelos CEPs)'}</p>
      <div><button class="outline" type="button" data-analysis="${esc(c.id)}">Analisar habilidades e distância com IA</button><p class="analysis-result" role="status"></p></div>`
        : ''
    }
    ${
      review
        ? `<small>Experiência ${c.parts.experience}/40 · Competências ${c.parts.skills}/25 · Região ${c.parts.region}/25 · Disponibilidade ${c.parts.availability}/10</small>
      <label class="check"><input type="checkbox" name="candidates" value="${c.id}" ${index < 5 ? 'checked' : ''}>Incluir na lista</label>`
        : `<p>${esc(c.email)} · ${esc(c.profile.phone)}</p>${job.status !== 'closed' && user.role === 'company' ? `<form class="stage-form" data-candidate="${c.id}">${select('Etapa', 'stage', stages, c.stage)}<button class="outline">Salvar etapa</button>${note}</form>` : `<strong>${esc(c.stage)}</strong>`}`
    }
    </article>`,
    )
    .join('');
}
async function jobPage(job) {
  const d = job.details,
    candidate = user.role === 'candidate',
    admin = user.role === 'admin';
  const info = [
    [
      'Local de trabalho',
      d.address
        ? [
            d.address.street,
            d.address.number,
            d.address.complement,
            d.address.district,
            d.city,
            d.address.state,
          ]
            .filter(Boolean)
            .join(', ')
        : d.city,
    ],
    ['Jornada', d.schedule],
    ['Escolaridade mínima', d.school],
    ['Experiência desejável', d.desiredExperience + ' ano(s)'],
    ['Competências obrigatórias', d.required.join(', ') || 'Nenhuma'],
    ['Competências desejáveis', [...d.hard, ...d.soft].join(', ') || 'Nenhuma'],
  ];
  let html =
    link('vagas', icon('arrow-left') + ' Voltar às vagas', 'inline') +
    heading(
      esc(job.title),
      esc(job.company) + ' · Aberta em ' + date(job.created_at),
      badge(job.status),
    ) +
    `<div class="sheet"><p class="prose">${esc(d.description)}</p><dl>${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${d.locationRequired ? '<p>Residência na cidade da vaga obrigatória.</p>' : ''}</div>`;
  if (candidate)
    return (
      html +
      (job.stage
        ? `<p class="callout">Sua etapa: ${esc(job.stage)}</p>`
        : job.interested
          ? '<p class="callout">Seu interesse foi registrado.</p>'
          : job.status !== 'triagem'
            ? '<p>A triagem desta vaga foi concluída.</p>'
            : user.consent_at
              ? '<button class="primary" data-action="interest">Registrar interesse</button>'
              : link('perfil', 'Completar perfil para participar'))
    );
  const review = admin && job.status === 'triagem';
  const list = await api(
    '/jobs/' + job.id + (review ? '/review' : '/shortlist'),
  );
  html +=
    '<h2>' +
    (review ? 'Revisar perfis compatíveis' : 'Perfis enviados') +
    '</h2>';
  if (review) html += aiPanel(job);
  html +=
    review && list.length
      ? `<form id="review" data-version="${esc(job.ai_match?.version)}"><p>Escolha até cinco perfis para enviar à empresa.</p>${cards(list, job, true)}${submit('Enviar lista à empresa')}</form>`
      : cards(list, job, review);
  if (!admin && job.status !== 'closed')
    html +=
      '<div class="end"><button class="outline" data-action="close">Encerrar vaga</button></div>';
  return html;
}
async function content() {
  if (user.role !== 'admin' && !user.profile.complete) return profilePage();
  const path = route(),
    candidate = user.role === 'candidate';
  if (path === 'perfil' && user.role !== 'admin') return profilePage();
  if (path === 'configuracoes' && user.role === 'company') return companySettings();
  if (path === 'nova' && user.role === 'company') return newJob();
  if (path === 'avisos' && candidate) {
    const notices = await api('/notices');
    return (
      heading(
        'Avisos',
        'Atualizações dos seus processos seletivos.',
        notices.some((n) => !n.read_at)
          ? '<button class="outline" data-action="read">Marcar todos como lidos</button>'
          : '',
      ) +
      (notices.length
        ? notices
            .map(
              (n) =>
                `<article class="person"><small>${date(n.created_at)} · ${n.read_at ? 'Lido' : 'Novo'}</small><p>${esc(n.message)}</p></article>`,
            )
            .join('')
        : empty(
            'Nenhum aviso',
            'Você receberá um aviso quando seu perfil for enviado ou o processo mudar.',
          ))
    );
  }
  const jobs = await api('/jobs');
  if (path.startsWith('vaga/')) {
    const job = jobs.find((j) => j.id === path.split('/')[1]);
    return job
      ? jobPage(job)
      : empty('Vaga indisponível', 'Consulte as vagas no menu.');
  }
  if (path === 'processos' && candidate)
    return (
      heading('Meus processos') +
      jobList(
        jobs.filter((j) => j.interested || j.stage),
        'Os processos em que você manifestar interesse ou for pré-selecionado aparecerão aqui.',
      )
    );
  if (path === 'vagas')
    return (
      heading(
        candidate
          ? 'Vagas abertas'
          : user.role === 'admin'
            ? 'Triagem de vagas'
            : 'Minhas vagas',
        '',
        user.role === 'company' ? link('nova', 'Abrir vaga', 'primary') : '',
      ) + jobList(candidate ? jobs.filter((j) => j.status !== 'closed') : jobs)
    );
  return overview(jobs);
}
async function render() {
  const current = ++revision;
  root.setAttribute('aria-busy', 'true');
  try {
    if (!user) {
      root.innerHTML = authPage();
      return;
    }
    const html = await content();
    if (current === revision) {
      root.innerHTML = shell(html);
      document.title =
        (root.querySelector('h1')?.textContent || 'Painel') + ' · JJ Serviços';
    }
  } catch (err) {
    if (current === revision)
      root.innerHTML = (user ? shell : (s) => s)(
        empty('Falha ao carregar', err.message) +
          '<button class="outline" data-action="retry">Tentar novamente</button>',
      );
  } finally {
    if (current === revision) root.setAttribute('aria-busy', 'false');
  }
}
async function boot() {
  try {
    user = await api('/me');
  } catch (err) {
    if (err.status !== 401) {
      root.innerHTML =
        empty('Servidor indisponível', err.message) +
        '<button class="outline" data-action="boot">Tentar novamente</button>';
      root.setAttribute('aria-busy', 'false');
      return;
    }
  }
  render();
}
root.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target,
    data = Object.fromEntries(new FormData(form)),
    button =
      event.submitter ||
      form.querySelector('button[type="submit"]') ||
      form.querySelector('button');
  const error = form.querySelector('.error'),
    id = route().split('/')[1];
  button.disabled = true;
  error.textContent = '';
  try {
    if (form.id === 'auth') {
      const register = route() === 'cadastro';
      await api(register ? '/register' : '/login', 'POST', {
        ...data,
        role: access,
      });
      user = await api('/me');
      go(user.role !== 'admin' && !user.profile.complete ? 'perfil' : 'inicio');
    } else if (form.id === 'profile') {
      await api('/me', 'PUT', {
        ...data,
        ...collectedSkills(form),
        roles: collectRoles(form),
        address: readAddress(form),
        consent: !!data.consent,
      });
      user = await api('/me');
      toast('Cadastro salvo.');
      go('inicio');
    } else if (form.id === 'company-settings') {
      const settings = await api('/me/settings', 'PUT', data);
      user.profile.settings = settings;
      toast('Configurações salvas.');
    } else if (form.id === 'new-job') {
      const job = await api('/jobs', 'POST', {
        ...data,
        ...collectedSkills(form),
        required: values(form, 'required'),
        address: readAddress(form),
        locationRequired: !!data.locationRequired,
      });
      toast('Vaga aberta para triagem.');
      go('vaga/' + job.id);
    } else if (form.id === 'ai-generate') {
      await api('/jobs/' + id + '/ai/suggest', 'POST');
      await render();
    } else if (form.id === 'ai-terms') {
      await api('/jobs/' + id + '/ai/terms', 'PUT', {
        version: form.dataset.version,
        selected: new FormData(form).getAll('selected').map(Number),
      });
      toast('Recomendações atualizadas.');
      await render();
    } else if (form.id === 'review') {
      await api('/jobs/' + id + '/publish', 'POST', {
        candidates: new FormData(form).getAll('candidates'),
        version: form.dataset.version || null,
      });
      toast('Lista enviada à empresa.');
      render();
    } else if (form.classList.contains('stage-form')) {
      await api('/jobs/' + id + '/stage', 'PUT', {
        stage: data.stage,
        candidate: form.dataset.candidate,
      });
      toast('Etapa salva.');
      render();
    } else if (
      form.id === 'delete' &&
      confirm('Excluir definitivamente sua conta e seus dados?')
    ) {
      await api('/me', 'DELETE', data);
      user = null;
      toast('Conta excluída.');
      go('entrar');
    }
  } catch (err) {
    error.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});
root.addEventListener('click', async (event) => {
  const role = event.target.closest('[data-role]')?.dataset.role;
  if (role) {
    access = role;
    if (role === 'admin') go('entrar');
    else render();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = route().split('/')[1];
  button.disabled = true;
  try {
    switch (button.dataset.action) {
      case 'boot':
        await boot();
        return;
      case 'logout':
        await api('/logout', 'POST');
        access = user.role;
        user = null;
        go('entrar');
        return;
      case 'interest':
        await api('/jobs/' + id + '/interest', 'POST');
        toast('Interesse registrado.');
        break;
      case 'close':
        if (!confirm('Encerrar a vaga e avisar os participantes?')) return;
        await api('/jobs/' + id + '/close', 'POST');
        toast('Vaga encerrada.');
        break;
      case 'read':
        await api('/notices/read', 'POST');
        break;
    }
    render();
  } catch (err) {
    toast(err.message);
  } finally {
    button.disabled = false;
  }
});
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});
bindFormControls(root);
boot();

root.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-analysis]');
  if (!button) return;
  const result = button.nextElementSibling;
  button.disabled = true;
  result.textContent = 'Consultando o Gemini…';
  try {
    const report = await api(
      '/jobs/' + route().split('/')[1] + '/analysis/' + button.dataset.analysis,
      'POST',
    );
    result.textContent = report.competencias + ' ' + report.proximidade;
    button.hidden = true;
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
root.addEventListener('input', async (event) => {
  const input = event.target;
  if (input.name !== 'cep') return;
  const form = input.form,
    cep = input.value.trim().replace('-', ''),
    status = form.querySelector('.cep-status');
  const ticket = String(Number(input.dataset.request || 0) + 1);
  input.dataset.request = ticket;
  if (!/^\d{8}$/.test(cep)) {
    status.textContent = '';
    return;
  }
  status.textContent = 'Buscando endereço…';
  const keys = ['street', 'district', 'city', 'state'];
  const previous = keys.map((k) => form.elements[k].value);
  try {
    const found = await api('/cep/' + cep);
    if (input.dataset.request !== ticket) return;
    keys.forEach((k, i) => {
      if (form.elements[k].value === previous[i])
        form.elements[k].value = found[k] || '';
    });
    status.textContent = 'Confira o endereço e informe o número.';
  } catch (error) {
    if (input.dataset.request === ticket) status.textContent = error.message;
  }
});
