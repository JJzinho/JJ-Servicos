import { readFile } from 'node:fs/promises';
import { pool, transaction } from '../server/db.js';
try {
  const sql = await readFile(
    new URL('../db/schema.sql', import.meta.url),
    'utf8',
  );
  await transaction((db) => db.query(sql));
  console.log('Banco de dados da JJ Serviços preparado.');
} finally {
  await pool.end();
}
