import { getPosts } from '../lib/posts';
export async function GET() {
  return new Response(JSON.stringify((await getPosts()).map(post => post.id)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
