import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';
import { fail, field } from './domain.js';
const derive = promisify(scrypt);
const digest = (value) => createHash('sha256').update(value).digest('hex');
export function emailOf(input) {
  const email = field(input, 'e-mail', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail(400, 'Informe um e-mail válido.');
  return email;
}
export async function hashPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128
  )
    fail(400, 'Use uma senha de 8 a 128 caracteres.');
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64)).toString('hex');
}
const dummy = await hashPassword(randomBytes(24).toString('hex'));
export async function passwordMatches(password, stored = dummy) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [salt, key] = stored.split(':');
  return timingSafeEqual(
    await derive(password, salt, 64),
    Buffer.from(key, 'hex'),
  );
}
const duration = 7 * 24 * 60 * 60 * 1000;
export function cookieHash(req) {
  const token = (req.headers.cookie || '').match(
    /(?:^|;\s*)jj_session=([a-f0-9]{64})(?:;|$)/,
  )?.[1];
  return token && digest(token);
}
export async function startSession(db, accountId) {
  const token = randomBytes(32).toString('hex');
  await db.query('DELETE FROM jj.sessions WHERE expires_at <= now()');
  await db.query('INSERT INTO jj.sessions VALUES ($1,$2,$3)', [
    digest(token),
    accountId,
    new Date(Date.now() + duration),
  ]);
  return token;
}
export function setCookie(res, token) {
  res.cookie('jj_session', token, {
    httpOnly: true,
    secure: process.env.VERCEL === '1',
    sameSite: 'strict',
    path: '/',
    maxAge: duration,
  });
}
export async function authenticated(req, res, next) {
  const hash = cookieHash(req);
  const account =
    hash &&
    (
      await pool.query(
        `SELECT a.id,a.name,a.role,a.email,a.profile,a.consent_at FROM jj.sessions s
    JOIN jj.accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
        [hash],
      )
    ).rows[0];
  if (!account) fail(401, 'Entre para acessar o sistema.');
  req.user = account;
  next();
}
export const allow =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      fail(403, 'Seu perfil não tem acesso a esta operação.');
    next();
  };
