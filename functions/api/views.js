const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (!['GET', 'POST'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, POST' } });
  }
  if (request.method === 'POST') {
    // Do not count preview deployments or writes from other websites.
    if (!['blog.pheth.com', 'pheth-blog.pages.dev', 'localhost', '127.0.0.1'].includes(url.hostname) ||
        request.headers.get('Origin') !== url.origin ||
        request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Forbidden' }, 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Expected JSON' }, 415);
    if (Number(request.headers.get('Content-Length')) > 1024) return json({ error: 'Body too large' }, 413);
  }
  try {
    // The build generates this list from published content, excluding drafts.
    const manifest = await env.ASSETS.fetch(new URL('/post-slugs.json', url));
    if (!manifest.ok) throw new Error('Post manifest unavailable');
    const slugs = await manifest.json();
    if (!Array.isArray(slugs) || !slugs.every(s => typeof s === 'string')) throw new Error('Invalid post manifest');
    if (request.method === 'GET') {
      const { results } = await env.VIEWS_DB.prepare('SELECT slug, views FROM article_views').all();
      const counts = Object.fromEntries(slugs.map(slug => [slug, 0]));
      for (const row of results) if (Object.hasOwn(counts, row.slug)) counts[row.slug] = row.views;
      return json({ counts });
    }
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 1024) return json({ error: 'Body too large' }, 413);
      body = JSON.parse(raw);
    } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (typeof body?.slug !== 'string' || !slugs.includes(body.slug)) return json({ error: 'Unknown article' }, 404);
    // A single atomic statement avoids lost increments during concurrent requests.
    const row = await env.VIEWS_DB.prepare(
      'INSERT INTO article_views (slug, views) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET views = article_views.views + 1 RETURNING views'
    ).bind(body.slug).first();
    return json({ views: row.views });
  } catch {
    return json({ error: 'Reading statistics temporarily unavailable' }, 503);
  }
}
