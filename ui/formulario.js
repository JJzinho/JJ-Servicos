export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function input(label, key, value = '', options = {}) {
  const {
    type = 'text',
    required = true,
    max = 120,
    hint = '',
    extra = '',
  } = options;
  return `<label>${label}<input name="${key}" type="${type}" value="${esc(formatField(key, value))}" maxlength="${max}" ${required ? 'required' : ''} ${extra}>${hint ? '<small>' + hint + '</small>' : ''}</label>`;
}
export function area(label, key, value, max, required = false) {
  return `<label>${label}<textarea name="${key}" maxlength="${max}" rows="4" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`;
}
export function select(label, key, values, selected) {
  return `<label>${label}<select name="${key}">${values.map((v) => `<option ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
}
export const number = (label, key, value) =>
  input(label, key, value ?? 0, {
    type: 'number',
    extra: 'min="0" max="80" step="1"',
  });
export const catalog = {
  roles: [
    'Atendente de loja',
    'Operador de caixa',
    'Auxiliar administrativo',
    'Recepcionista',
    'Vendedor',
    'Repositor',
    'Estoquista',
    'Auxiliar de logística',
    'Auxiliar de cozinha',
    'Garçom',
    'Auxiliar de serviços gerais',
    'Assistente de atendimento',
  ],
  hard: [
    'Atendimento ao cliente',
    'Ponto de venda',
    'Operação de caixa',
    'Informática básica',
    'Excel',
    'Controle de estoque',
    'Vendas',
    'Organização de documentos',
    'Emissão de notas fiscais',
    'Preparo de alimentos',
    'Separação de pedidos',
    'Higienização de ambientes',
  ],
  soft: [
    'Comunicação',
    'Organização',
    'Trabalho em equipe',
    'Pontualidade',
    'Proatividade',
    'Atenção aos detalhes',
    'Adaptabilidade',
    'Resolução de problemas',
    'Empatia',
    'Responsabilidade',
  ],
};
const clean = (text) =>
  text
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
function optionTag(key, text, checked) {
  return `<label class="pick"><input type="checkbox" name="${key}" value="${esc(text)}" ${checked ? 'checked' : ''}><span>${esc(text)}</span></label>`;
}
export function checklist(label, key, preset, selected = []) {
  const names = new Map([...preset, ...selected].map((s) => [clean(s), s]));
  const checked = new Set(selected.map(clean));
  return `<fieldset class="choice-set" data-group="${key}"><legend>${label}</legend>${key === 'roles' ? '<p class="pick-help">Marque suas funções e clique em cada uma abaixo para informar a experiência.</p>' : ''}<div class="picks">${[...names.values()].map((s) => optionTag(key, s, checked.has(clean(s)))).join('')}</div>
    <div class="add-option"><input aria-label="Outra opção para ${label}" maxlength="${key === 'roles' ? 120 : 80}" placeholder="${key === 'roles' ? 'Adicionar outra função' : 'Adicionar outra competência'}"><button type="button" class="outline" data-add>Adicionar</button></div></fieldset>`;
}
function experienceStatus(years, summary) {
  if (!summary?.trim() || years === '') return 'Preencher experiência';
  if (Number(years) === 0) return 'Menos de 1 ano';
  return Number(years) === 1 ? '1 ano' : years + ' anos';
}
function roleDetails(role) {
  return `<details class="role-entry" data-function="${esc(role.title)}">
    <summary><span>${esc(role.title)}</span><small class="role-status">${esc(experienceStatus(role.years, role.summary))}</small></summary>
    <fieldset class="experience-fields"><legend class="sr-only">Experiência em ${esc(role.title)}</legend>
      ${number('Anos de experiência', 'roleYears', role.years)}
      <div>${area('Descrição da experiência', 'roleSummary', role.summary || '', 2400, true)}<small>Primeiro emprego? Informe zero anos e descreva cursos ou atividades relacionadas.</small></div>
    </fieldset></details>`;
}
export function referenceRoles(roles) {
  return `<section class="reference-roles">${checklist(
    'Funções de referência',
    'roles',
    catalog.roles,
    roles.map((r) => r.title),
  )}
    <div class="role-details">${roles.map(roleDetails).join('')}</div></section>`;
}
export function collectRoles(form) {
  return [...form.querySelectorAll('.role-entry:not([hidden])')].map(
    (entry) => ({
      title: entry.dataset.function,
      years: entry.querySelector('[name=roleYears]').value,
      summary: entry.querySelector('[name=roleSummary]').value,
    }),
  );
}
function showRole(input) {
  const container = input.form.querySelector('.role-details');
  let entry = [...container.children].find(
    (el) => clean(el.dataset.function) === clean(input.value),
  );
  if (!entry && input.checked) {
    container.insertAdjacentHTML(
      'beforeend',
      roleDetails({ title: input.value, years: 0 }),
    );
    return;
  }
  if (entry) {
    entry.open = false;
    entry.querySelector('fieldset').disabled = !input.checked;
    entry.hidden = !input.checked;
  }
}
export function locationFields(a = {}) {
  return `<fieldset class="location-fields"><legend>Endereço</legend><div class="form-grid">
    ${input('CEP', 'cep', a.cep, { max: 32, extra: 'inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" autocomplete="postal-code" placeholder="00000-000"' })}
    <small role="status" class="cep-status"></small>
    ${input('Rua ou avenida', 'street', a.street, { max: 180 })}${input('Número', 'number', a.number, { max: 20, hint: 'Se não houver número, use S/N.' })}
    ${input('Complemento (opcional)', 'complement', a.complement, { required: false })}${input('Bairro', 'district', a.district)}
    ${input('Cidade', 'city', a.city)}${input('UF', 'state', a.state, { max: 2, extra: 'pattern="[A-Za-z]{2}" placeholder="PE"' })}</div></fieldset>`;
}
export function readAddress(form) {
  const a = Object.fromEntries(
    ['cep', 'street', 'number', 'complement', 'district', 'city', 'state'].map(
      (k) => [k, form.elements[k].value.trim()],
    ),
  );
  a.state = a.state.toUpperCase();
  return a;
}
export function values(form, key) {
  return new FormData(form).getAll(key);
}
export function collectedSkills(form) {
  return { hard: values(form, 'hard'), soft: values(form, 'soft') };
}

export function bindFormControls(root) {
  root.addEventListener('change', (event) => {
    if (event.target.matches('input[name=roles]')) showRole(event.target);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('.add-option input')) {
      event.preventDefault();
      event.target.parentElement.querySelector('button').click();
    }
  });
  root.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add]');
    if (add) {
      const group = add.closest('[data-group]'),
        input = add.parentElement.querySelector('input');
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      const picks = group.querySelector('.picks');
      let item = [...picks.querySelectorAll('input')].find(
        (el) => clean(el.value) === clean(value),
      );
      if (!item) {
        picks.insertAdjacentHTML(
          'beforeend',
          optionTag(group.dataset.group, value, true),
        );
        item = picks.lastElementChild.querySelector('input');
      }
      item.checked = true;
      if (item.name === 'roles') showRole(item);
      input.value = '';
      input.focus();
      return;
    }
  });
  root.addEventListener(
    'invalid',
    (event) => {
      const entry = event.target.closest('.role-entry');
      if (
        entry &&
        event.target ===
          entry
            .closest('form')
            .querySelector('input:invalid, select:invalid, textarea:invalid')
      )
        entry.open = true;
    },
    true,
  );
  root.addEventListener('beforeinput', (event) => {
    const input = event.target;
    if (
      !['cpf', 'cep', 'phone'].includes(input.name) ||
      input.selectionStart !== input.selectionEnd
    )
      return;
    const pos = input.selectionStart;
    // Ao apagar um separador automático, inclua o dígito vizinho na exclusão.
    if (event.inputType === 'deleteContentBackward') {
      const separator = input.value.slice(0, pos).match(/\d[^\d+]+$/);
      if (separator) input.setSelectionRange(pos - separator[0].length, pos);
    } else if (event.inputType === 'deleteContentForward') {
      const separator = input.value.slice(pos).match(/^[^\d+]+\d/);
      if (separator) input.setSelectionRange(pos, pos + separator[0].length);
    }
  });
  root.addEventListener('input', (event) => {
    const input = event.target;
    const entry = input.closest('.role-entry');
    if (entry) {
      entry.querySelector('.role-status').textContent = experienceStatus(
        entry.querySelector('[name=roleYears]').value,
        entry.querySelector('[name=roleSummary]').value,
      );
    }
    if (!['cpf', 'cep', 'phone'].includes(input.name) || event.isComposing)
      return;
    const before = input.value;
    const formatted = formatField(input.name, before);
    if (before === formatted) return;
    const pos = input.selectionStart;
    const prefix = before.slice(0, pos);
    const digitCount = prefix.replace(/\D/g, '').length;
    input.value = formatted;
    let caret = pos === before.length ? formatted.length : 0;
    if (pos !== before.length) {
      let count = 0;
      while (caret < formatted.length && count < digitCount) {
        if (/\d/.test(formatted[caret])) count++;
        caret++;
      }
      if (!digitCount && prefix.includes('+') && formatted.startsWith('+'))
        caret = 1;
    }
    input.setSelectionRange(caret, caret);
  });
}

export function formatField(name, value = '') {
  if (value == null) return '';
  if (!['cpf', 'cep', 'phone'].includes(name)) return value;
  const text = String(value);
  const digits = text.replace(/\D/g, '');
  if (name === 'cpf')
    return digits
      .slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2');
  if (name === 'cep')
    return digits.slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

  const international = text.trimStart().startsWith('+');
  const brazil =
    digits.startsWith('55') &&
    (international || digits.length === 12 || digits.length === 13);
  if (international && !brazil) return '+' + digits;
  if (!brazil && digits.length > 11) return digits;
  const local = brazil ? digits.slice(2) : digits;
  const prefix = brazil ? '+55' : '';
  if (!local) return prefix;
  // Preserve números internacionais já cadastrados, inclusive formatos não brasileiros.
  if (local.length > 11) return prefix + local;
  const ddd = local.slice(0, 2);
  const subscriber = local.slice(2);
  const split = subscriber.length > 8 ? 5 : 4;
  let formatted = '(' + ddd;
  if (subscriber) formatted += ') ' + subscriber.slice(0, split);
  if (subscriber.length > split) formatted += '-' + subscriber.slice(split);
  return prefix ? prefix + ' ' + formatted : formatted;
}
