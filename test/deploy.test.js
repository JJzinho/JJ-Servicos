import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

test('entrada da Vercel serve o login e responde à API por HTTPS', async () => {
  process.env.VERCEL = '1';
  process.env.DATABASE_URL = 'postgresql://localhost/jj_test';
  const { default: app } = await import('../server.js');
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port;
    const headers = { origin: url.replace('http:', 'https:'), 'content-type': 'application/json' };
    const page = await fetch(url);
    assert.match(await page.text(), /JJ Serviços/);
    for (const path of ['/app.js', '/styles.css', '/ui/formulario.js', '/ui/setores.js', '/assets/favicon.svg']) {
      assert.equal((await fetch(url + path)).status, 200);
    }
    const session = await fetch(url + '/api/me', { headers });
    assert.equal(session.status, 401);
    assert.deepEqual(await session.json(), { error: 'Entre para acessar o sistema.' });
    const register = await fetch(url + '/api/register', { method: 'POST', headers, body: '{}' });
    assert.equal(register.status, 400);
    const foreign = await fetch(url + '/api/register', {
      method: 'POST', headers: { ...headers, origin: 'https://other.example' }, body: '{}',
    });
    assert.equal(foreign.status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
