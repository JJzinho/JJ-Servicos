import app from '../server.js';
import { pool } from './db.js';

try {
  await pool.query(
    'SELECT j.ai_match,s.ai_evidence,s.match_facts FROM jj.jobs j, jj.selections s LIMIT 0',
  );
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '127.0.0.1', () =>
    console.log('JJ Serviços em http://localhost:' + port),
  );
} catch (err) {
  console.error(
    'Banco indisponível. Confira DATABASE_URL e execute npm run db:setup.',
    err.code || err.name,
  );
  await pool.end();
  process.exitCode = 1;
}
