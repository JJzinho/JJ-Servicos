import { lookupCep } from './server/address.js';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import {
  interpretFit,
  suggestTerms,
  approveTerms,
  GeminiUnavailable,
} from './server/gemini.js';
import { pool, transaction } from './server/db.js';
import {
  allow,
  authenticated,
  cookieHash,
  emailOf,
  hashPassword,
  passwordMatches,
  setCookie,
  startSession,
} from './server/auth.js';
import {
  choice,
  fail,
  field,
  jobData,
  publicProfile,
  addressData,
  normalize,
  match,
  profileData,
  companySettingsData,
  stages,
} from './server/domain.js';

const app = express();
const api = express.Router();
app.disable('x-powered-by');
const onVercel = process.env.VERCEL === '1';
if (onVercel) app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  next();
});
app.use('/api', api);
api.use(
  (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json'))
      fail(415, 'Envie os dados como JSON.');
    if (
      req.headers.origin &&
      req.headers.origin !== (onVercel ? 'https://' : req.protocol + '://') + req.headers.host
    )
      fail(403, 'Origem inválida.');
    next();
  },
  express.json({ limit: '256kb' }),
);
const authLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});

api.post('/register', authLimit, async (req, res) => {
  const { role, password } = req.body;
  choice(role, ['company', 'candidate'], 'tipo de conta');
  const name = field(req.body.name, 'nome');
  const email = emailOf(req.body.email),
    hash = await hashPassword(password);
  const token = await transaction(async (db) => {
    const result = await db.query(
      'INSERT INTO jj.accounts(role,email,password_hash,name) VALUES ($1,$2,$3,$4) RETURNING id',
      [role, email, hash, name],
    );
    return startSession(db, result.rows[0].id);
  });
  setCookie(res, token);
  res.status(201).json({ ok: true });
});
api.post('/login', authLimit, async (req, res) => {
  const { role, password } = req.body;
  const account = (
    await pool.query(
      'SELECT id,role,password_hash FROM jj.accounts WHERE email=$1',
      [emailOf(req.body.email)],
    )
  ).rows[0];
  if (
    !(await passwordMatches(password, account?.password_hash)) ||
    !account ||
    account.role !== role
  ) {
    fail(401, 'Confira o e-mail, a senha e o tipo de acesso.');
  }
  setCookie(res, await startSession(pool, account.id));
  res.json({ ok: true });
});
api.use(authenticated);
api.get('/me', (req, res) => res.json(req.user));
api.post('/logout', async (req, res) => {
  await pool.query('DELETE FROM jj.sessions WHERE token_hash=$1', [
    cookieHash(req),
  ]);
  res.clearCookie('jj_session', { path: '/' }).json({ ok: true });
});
api.get(
  '/cep/:cep',
  rateLimit({
    windowMs: 60000,
    limit: 45,
    message: { error: 'Aguarde antes de consultar outro CEP.' },
  }),
  async (req, res) => {
    if (!/^\d{8}$/.test(req.params.cep))
      fail(400, 'Informe os oito dígitos do CEP.');
    const entry = await lookupCep(req.params.cep);
    if (!entry)
      fail(
        422,
        'Consulta indisponível ou CEP não localizado. Preencha o endereço manualmente.',
      );
    const { point, ...address } = entry;
    res.json(address);
  },
);
async function locate(address, previous) {
  const sameLocality = (other) =>
    other &&
    other.cep === address.cep &&
    other.state === address.state &&
    normalize(other.city) === normalize(address.city);
  if (previous?.point && sameLocality(previous)) return previous.point;
  const found = await lookupCep(address.cep);
  return sameLocality(found) ? found.point : null;
}
api.put('/me', allow('candidate', 'company'), async (req, res) => {
  const name = field(req.body.name, 'nome');
  const profile = profileData(req.user.role, req.body, req.user.profile.sector);
  profile.address.point = await locate(
    profile.address,
    req.user.profile.address,
  );
  const consent = req.user.role === 'candidate' && req.body.consent === true;
  await pool.query(
    `UPDATE jj.accounts SET name=$2,
    profile=$3::jsonb || CASE WHEN profile ? 'settings'
      THEN jsonb_build_object('settings', profile->'settings') ELSE '{}'::jsonb END,
    consent_at=
    CASE WHEN $4 THEN coalesce(consent_at, now()) ELSE NULL END WHERE id=$1`,
    [req.user.id, name, profile, consent],
  );
  res.json({ ok: true });
});
api.delete('/me', allow('candidate'), authLimit, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT password_hash FROM jj.accounts WHERE id=$1',
    [req.user.id],
  );
  if (!(await passwordMatches(req.body.password, rows[0].password_hash)))
    fail(400, 'Confira sua senha.');
  await pool.query('DELETE FROM jj.accounts WHERE id=$1', [req.user.id]);
  res.clearCookie('jj_session', { path: '/' }).json({ ok: true });
});

api.use((req, res, next) => {
  if (req.user.role !== 'admin' && req.user.profile.complete !== true)
    return res.status(403).json({
      error: 'Complete seu cadastro para acessar o sistema.',
      code: 'PROFILE_INCOMPLETE',
    });
  next();
});
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
api.put('/me/settings', allow('company'), async (req, res) => {
  const settings = companySettingsData(req.body);
  await pool.query(
    "UPDATE jj.accounts SET profile=jsonb_set(profile, '{settings}', $2::jsonb) WHERE id=$1",
    [req.user.id, settings],
  );
  res.json(settings);
});
api.param('id', (req, res, next, value) => {
  if (!uuid.test(value)) fail(404, 'Vaga não encontrada.');
  next();
});
async function jobFor(db, id, user, lock = false) {
  const job = (
    await db.query(
      `SELECT j.*,a.name AS company FROM jj.jobs j JOIN jj.accounts a ON a.id=j.company_id
    WHERE j.id=$1 ${lock ? 'FOR UPDATE OF j' : ''}`,
      [id],
    )
  ).rows[0];
  if (!job || (user.role === 'company' && job.company_id !== user.id))
    fail(404, 'Vaga não encontrada.');
  return job;
}
function requireOpen(job) {
  if (job.status === 'closed') fail(409, 'Esta vaga foi encerrada.');
}
api.get('/jobs', async (req, res) => {
  const { role, id } = req.user;
  const { rows } = await pool.query(
    `SELECT j.id,j.title,j.company_id,j.status,j.details,j.created_at,a.name AS company,
    CASE WHEN $1='admin' THEN j.ai_match END AS ai_match,
    EXISTS(SELECT 1 FROM jj.interests i WHERE i.job_id=j.id AND i.candidate_id=$2) AS interested,
    s.stage FROM jj.jobs j JOIN jj.accounts a ON a.id=j.company_id
    LEFT JOIN jj.selections s ON s.job_id=j.id AND s.candidate_id=$2
    WHERE $1='admin' OR ($1='company' AND j.company_id=$2)
    OR ($1='candidate' AND (j.status<>'closed' OR s.stage IS NOT NULL OR EXISTS
      (SELECT 1 FROM jj.interests i WHERE i.job_id=j.id AND i.candidate_id=$2)))
    ORDER BY j.created_at DESC,j.id`,
    [role, id],
  );
  res.json(rows);
});
api.post('/jobs', allow('company'), async (req, res) => {
  if (!req.user.profile.city)
    fail(400, 'Complete o cadastro da empresa antes de abrir uma vaga.');
  const title = field(req.body.title, 'título'),
    address = addressData(req.body.address),
    details = jobData({ ...req.body, city: address.city });
  address.point = await locate(address, req.user.profile.address);
  details.address = address;
  const { rows } = await pool.query(
    'INSERT INTO jj.jobs(company_id,title,details) VALUES ($1,$2,$3) RETURNING id',
    [req.user.id, title, details],
  );
  res.status(201).json(rows[0]);
});
api.post('/jobs/:id/interest', allow('candidate'), async (req, res) => {
  if (!req.user.consent_at)
    fail(400, 'Complete o perfil e autorize a participação na triagem.');
  await transaction(async (db) => {
    const job = await jobFor(db, req.params.id, req.user, true);
    if (job.status !== 'triagem')
      fail(409, 'A triagem desta vaga já terminou.');
    await db.query(
      'INSERT INTO jj.interests VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [job.id, req.user.id],
    );
  });
  res.json({ ok: true });
});
async function ranking(db, job, ids) {
  const { rows } = await db.query(
    `SELECT id,name,profile,created_at FROM jj.accounts
    WHERE role='candidate' AND profile @> '{"complete":true}' AND consent_at IS NOT NULL AND ($1::uuid[] IS NULL OR id=ANY($1))
    ORDER BY created_at,id ${ids ? 'FOR SHARE' : ''}`,
    [ids ?? null],
  );
  const approved =
    job.ai_match?.approved.map((index) => job.ai_match.suggestions[index]) ??
    [];
  return rows
    .flatMap((candidate) => {
      const result = match(
        candidate.profile,
        {
          ...job.details,
          title: job.title,
        },
        approved,
      );
      return result
        ? [
            {
              ...candidate,
              profile: publicProfile(candidate.profile),
              ...result,
            },
          ]
        : [];
    })
    .sort((a, b) => b.score - a.score);
}
api.get('/jobs/:id/review', allow('admin'), async (req, res) => {
  const job = await jobFor(pool, req.params.id, req.user);
  if (job.status !== 'triagem')
    fail(409, 'A triagem desta vaga já foi concluída.');
  res.json(await ranking(pool, job));
});
const generating = new Set();
const geminiLimit = rateLimit({
  windowMs: 60000,
  limit: 10,
  message: {
    error: 'Aguarde um minuto antes de consultar o Gemini novamente.',
  },
});
api.post(
  '/jobs/:id/ai/suggest',
  allow('admin'),
  geminiLimit,
  async (req, res) => {
    const job = await jobFor(pool, req.params.id, req.user);
    if (job.status !== 'triagem') fail(409, 'Esta vaga já saiu da triagem.');
    if (job.ai_match) return res.json(job.ai_match);
    if (generating.has(job.id))
      fail(409, 'Já existe uma consulta em andamento para esta vaga.');
    generating.add(job.id);
    try {
      const suggestions = await suggestTerms(job);
      const { rows } = await pool.query(
        `UPDATE jj.jobs SET ai_match=coalesce(ai_match,$2::jsonb)
      WHERE id=$1 AND status='triagem' RETURNING ai_match`,
        [job.id, suggestions],
      );
      if (!rows.length) fail(409, 'Esta vaga já saiu da triagem.');
      res.json(rows[0].ai_match);
    } finally {
      generating.delete(job.id);
    }
  },
);
api.put('/jobs/:id/ai/terms', allow('admin'), async (req, res) => {
  await transaction(async (db) => {
    const job = await jobFor(db, req.params.id, req.user, true);
    if (job.status !== 'triagem') fail(409, 'Esta vaga já saiu da triagem.');
    const updated = approveTerms(job.ai_match, req.body);
    await db.query('UPDATE jj.jobs SET ai_match=$2 WHERE id=$1', [
      job.id,
      updated,
    ]);
  });
  res.json({ ok: true });
});
api.post('/jobs/:id/publish', allow('admin'), async (req, res) => {
  const ids = req.body.candidates;
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 5 ||
    ids.some((id) => !uuid.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    fail(400, 'Selecione de um a cinco perfis diferentes.');
  }
  await transaction(async (db) => {
    const job = await jobFor(db, req.params.id, req.user, true);
    if (job.status !== 'triagem')
      fail(409, 'A triagem desta vaga já foi concluída.');
    if ((req.body.version ?? null) !== (job.ai_match?.version ?? null))
      fail(
        409,
        'As equivalências mudaram. Atualize a lista antes de enviá-la.',
      );
    const list = await ranking(db, job, ids);
    if (list.length !== ids.length)
      fail(409, 'Um perfil mudou. Atualize a triagem.');
    for (const [index, candidate] of list.entries()) {
      await db.query(
        'INSERT INTO jj.selections(job_id,candidate_id,position,score,ai_evidence,match_facts) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          job.id,
          candidate.id,
          index + 1,
          candidate.score,
          JSON.stringify(candidate.evidence ?? []),
          candidate.facts,
        ],
      );
      await notify(
        db,
        candidate.id,
        'Seu perfil foi enviado para a vaga ' +
          job.title +
          ' em ' +
          job.company +
          '.',
      );
    }
    await db.query("UPDATE jj.jobs SET status='sent' WHERE id=$1", [job.id]);
  });
  res.json({ ok: true });
});
async function notify(db, id, message) {
  await db.query(
    'INSERT INTO jj.notices(candidate_id,message) VALUES ($1,$2)',
    [id, message],
  );
}
api.get('/jobs/:id/shortlist', allow('company', 'admin'), async (req, res) => {
  const job = await jobFor(pool, req.params.id, req.user);
  const { rows } = await pool.query(
    `SELECT a.id,a.name,a.email,a.profile,s.stage,s.score,s.ai_evidence AS evidence,s.match_facts AS facts FROM jj.selections s JOIN jj.accounts a ON a.id=s.candidate_id
    WHERE s.job_id=$1 AND a.consent_at IS NOT NULL ORDER BY s.position`,
    [job.id],
  );
  res.json(rows.map((r) => ({ ...r, profile: publicProfile(r.profile) })));
});
api.post(
  '/jobs/:id/analysis/:candidate',
  allow('admin', 'company'),
  geminiLimit,
  async (req, res) => {
    const job = await jobFor(pool, req.params.id, req.user);
    const candidate = req.params.candidate;
    if (!uuid.test(candidate)) fail(400, 'Perfil inválido.');
    let facts;
    if (req.user.role === 'admin' && job.status === 'triagem') {
      facts = (await ranking(pool, job, [candidate]))[0]?.facts;
    } else {
      const { rows } = await pool.query(
        `SELECT s.match_facts FROM jj.selections s JOIN jj.accounts a ON a.id=s.candidate_id
      WHERE job_id=$1 AND candidate_id=$2 AND a.consent_at IS NOT NULL`,
        [job.id, candidate],
      );
      facts = rows[0]?.match_facts;
    }
    if (!facts) fail(404, 'Dados de compatibilidade indisponíveis.');
    res.json(await interpretFit(facts));
  },
);
api.put('/jobs/:id/stage', allow('company'), async (req, res) => {
  const stage = choice(req.body.stage, stages, 'etapa');
  if (!uuid.test(req.body.candidate)) fail(400, 'Candidato inválido.');
  await transaction(async (db) => {
    const job = await jobFor(db, req.params.id, req.user, true);
    requireOpen(job);
    const { rows } = await db.query(
      `SELECT s.stage FROM jj.selections s JOIN jj.accounts a ON a.id=s.candidate_id
      WHERE job_id=$1 AND candidate_id=$2 AND a.consent_at IS NOT NULL FOR SHARE OF a`,
      [job.id, req.body.candidate],
    );
    if (!rows.length) fail(404, 'Perfil indisponível.');
    if (rows[0].stage === stage) return;
    await db.query(
      'UPDATE jj.selections SET stage=$3 WHERE job_id=$1 AND candidate_id=$2',
      [job.id, req.body.candidate, stage],
    );
    await notify(
      db,
      req.body.candidate,
      job.title + ' · ' + job.company + ' — ' + stage + '.',
    );
  });
  res.json({ ok: true });
});
api.post('/jobs/:id/close', allow('company'), async (req, res) => {
  await transaction(async (db) => {
    const job = await jobFor(db, req.params.id, req.user, true);
    if (job.status === 'closed') return;
    await db.query("UPDATE jj.jobs SET status='closed' WHERE id=$1", [job.id]);
    await db.query(
      `INSERT INTO jj.notices(candidate_id,message)
      SELECT candidate_id,$2 FROM (SELECT candidate_id FROM jj.interests WHERE job_id=$1
        UNION SELECT candidate_id FROM jj.selections WHERE job_id=$1) participants`,
      [
        job.id,
        'Processo encerrado para ' + job.title + ' em ' + job.company + '.',
      ],
    );
  });
  res.json({ ok: true });
});
api.get('/notices', allow('candidate'), async (req, res) => {
  res.json(
    (
      await pool.query(
        'SELECT * FROM jj.notices WHERE candidate_id=$1 ORDER BY created_at DESC,id',
        [req.user.id],
      )
    ).rows,
  );
});
api.post('/notices/read', allow('candidate'), async (req, res) => {
  await pool.query(
    'UPDATE jj.notices SET read_at=now() WHERE candidate_id=$1 AND read_at IS NULL',
    [req.user.id],
  );
  res.json({ ok: true });
});
api.use((req, res) =>
  res.status(404).json({ error: 'Operação desconhecida.' }),
);
const root = fileURLToPath(new URL('./public/', import.meta.url));
app.use(express.static(root));
app.use((err, req, res, next) => {
  if (err instanceof GeminiUnavailable)
    return res.status(503).json({ error: err.message });
  if (err.code === '23505' && err.constraint === 'accounts_candidate_cpf')
    return res.status(409).json({
      error:
        'Não foi possível salvar este CPF. Confira os dados ou entre na conta já cadastrada.',
    });
  if (err.code === '23505')
    return res
      .status(409)
      .json({ error: 'Já existe um cadastro com esses dados.' });
  const status = err.status || 500;
  if (status >= 500) console.error('Falha na operação', err.code || err.name);
  res.status(status).json({
    error:
      status >= 500
        ? 'Não foi possível concluir a operação.'
        : err.type === 'entity.parse.failed'
          ? 'JSON inválido.'
          : err.message,
  });
});
export default app;
