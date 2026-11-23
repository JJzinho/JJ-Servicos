import pg from 'pg';
import { readFileSync } from 'node:fs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error('Preencha DATABASE_URL no arquivo .env antes de iniciar.');
const address = new URL(connectionString);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(address.hostname);
// pg aceita parâmetros SSL na URI que podem substituir a verificação abaixo.
for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl'])
  address.searchParams.delete(key);
const ca =
  process.env.PG_CA_PEM?.replace(/\\n/g, '\n') ||
  (process.env.PG_CA_FILE && readFileSync(process.env.PG_CA_FILE, 'utf8'));
export const pool = new pg.Pool({
  connectionString: address.toString(),
  max: process.env.VERCEL === '1' ? 2 : 6,
  connectionTimeoutMillis: 10000,
  ssl: local ? false : { rejectUnauthorized: true, ...(ca && { ca }) },
});
pool.on('error', (err) =>
  console.error('Conexão com PostgreSQL interrompida.', err.code),
);

export async function transaction(work) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const result = await work(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}
