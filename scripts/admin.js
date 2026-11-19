import { randomBytes } from 'node:crypto';
import { pool } from '../server/db.js';
import { emailOf, hashPassword } from '../server/auth.js';
try {
  const email = emailOf(process.argv[2]);
  const password = randomBytes(18).toString('base64url');
  await pool.query(
    "INSERT INTO jj.accounts(role,name,email,password_hash) VALUES ('admin','Equipe JJ',$1,$2)",
    [email, await hashPassword(password)],
  );
  console.log(
    'Acesso da equipe criado para %s. Guarde a senha: %s',
    email,
    password,
  );
} catch (error) {
  console.error(
    error.code === '23505' ? 'Este e-mail já possui uma conta.' : error.message,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
