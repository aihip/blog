import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/api/views.js';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_article_views.sql', import.meta.url), 'utf8'));
  const env = {
    ASSETS: { fetch: async () => Response.json(['first', 'second']) },
    VIEWS_DB: { prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        all: async () => ({ results: statement.all() }),
        bind: (...values) => ({ first: async () => statement.get(...values) }),
      };
    } },
  };
  const call = (method = 'GET', body, origin = 'https://pheth-blog.pages.dev', host = 'pheth-blog.pages.dev') => onRequest({
    env, request: new Request(`https://${host}/api/views`, {
      method, headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  });
  return { sqlite, env, call };
}

test('lists zero counts; GET does not increment; concurrent writes accumulate atomically', async () => {
  const { call, sqlite } = fixture();
  try {
    assert.deepEqual(await (await call()).json(), { counts: { first: 0, second: 0 } });
    const writes = await Promise.all(Array.from({ length: 20 }, () => call('POST', { slug: 'first' })));
    assert.ok(writes.every(r => r.status === 200));
    for (let i = 0; i < 2; i++) {
      const res = await call();
      assert.equal(res.headers.get('Cache-Control'), 'no-store');
      assert.deepEqual(await res.json(), { counts: { first: 20, second: 0 } });
    }
  } finally { sqlite.close(); }
});

test('rejects unknown articles, cross-origin writes and preview writes', async () => {
  const { call, sqlite } = fixture();
  try {
    assert.equal((await call('POST', { slug: 'draft-or-missing' })).status, 404);
    assert.equal((await call('POST', { slug: 'first' }, 'https://other.example')).status, 403);
    assert.equal((await call('POST', { slug: 'first' }, 'https://preview.pheth-blog.pages.dev', 'preview.pheth-blog.pages.dev')).status, 403);
    assert.equal((await call('DELETE')).status, 405);
    assert.deepEqual(await (await call()).json(), { counts: { first: 0, second: 0 } });
  } finally { sqlite.close(); }
});

test('does not expose counts for removed posts; database failure returns 503', async () => {
  const { call, env, sqlite } = fixture();
  try {
    sqlite.exec("INSERT INTO article_views VALUES ('removed', 100)");
    assert.deepEqual(await (await call()).json(), { counts: { first: 0, second: 0 } });
    env.VIEWS_DB.prepare = () => { throw new Error('Database unavailable'); };
    const response = await call();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  } finally { sqlite.close(); }
});

test('rejects malformed JSON and oversized bodies', async () => {
  const { env, call, sqlite } = fixture();
  try {
    const request = new Request('https://pheth-blog.pages.dev/api/views', { method: 'POST', headers: { Origin: 'https://pheth-blog.pages.dev', 'Content-Type': 'application/json' }, body: '{' });
    assert.equal((await onRequest({ request, env })).status, 400);
    assert.equal((await call('POST', { slug: 'x'.repeat(2000) })).status, 413);
  } finally { sqlite.close(); }
});
