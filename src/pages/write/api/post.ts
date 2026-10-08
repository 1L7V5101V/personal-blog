import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { canWrite } from '../../../lib/access';
import { loadPost, savePost, tooLarge } from '../../../lib/writer';

// 这两个接口都读库，构建期没有库可读
export const prerender = false;

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * 谁能调：本地 dev（astro dev）直接放行，线上必须是过了 Access 的请求。
 * ⚠ 线上的判据是 CF-Access-JWT 这个头，不看 Host 也不看 IP —— 没配 Access 变量时
 *   canWrite 一律返回 false，接口就是 403，不会退化成「谁都能写」。
 */
async function allowed(ctx: { request: Request }): Promise<boolean> {
  return canWrite(ctx.request, env);
}

/** POST：存文章。body = { mode, column, title, slug, markdown, html } */
export const POST: APIRoute = async (ctx) => {
  if (!(await allowed(ctx))) return json(403, { error: '没过 Access，不能写' });

  const raw = await ctx.request.text();
  if (tooLarge(raw)) return json(413, { error: '正文太大' });
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return json(400, { error: '请求体不是 JSON' });
  }

  const mode = payload.mode === 'edit' ? 'edit' : 'new';
  const result = await savePost(env.DB, payload, mode);
  return json(result.status, result.data);
};

/** GET ?slug=xxx：编辑已有文章时取回 Markdown 和标题 */
export const GET: APIRoute = async (ctx) => {
  if (!(await allowed(ctx))) return json(403, { error: '没过 Access，不能读' });
  const slug = ctx.url.searchParams.get('slug');
  if (!slug) return json(400, { error: '没带 slug' });
  const result = await loadPost(env.DB, slug);
  return json(result.status, result.data);
};
