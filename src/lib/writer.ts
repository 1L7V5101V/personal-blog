/**
 * 站上写作的后端规则：正文收不收、收下来存成什么样。
 * 排版不在这里 —— 那一步在浏览器里跑 src/lib/render.ts（原因见下面第一条警告）。
 *
 * ⚠ 为什么排版不放在服务端：Workers Free 计划每个 HTTP 请求只有 10ms CPU，超了就
 *   返回 Error 1102。实测排一篇 0.2KB 的短文要 29ms，那篇 21.6KB 的长笔记要 675ms。
 *   所以线上是「浏览器排版 → 把 Markdown 和排好的 HTML 一起交上来 → 存库」，
 *   文章页只把库里的 HTML 吐出去，不在请求里排任何东西。
 * ⚠ 代价：交上来的 HTML 是客户端产的，入库前必须净洗（下面 sanitize），
 *   并且文章页要挂 script-src 'self' 的内容安全政策兜住漏网的内联处理器。
 */
import { COLUMNS } from '../data/columns';
import { partStatements, readBody } from './post-parts';
import type { Db } from './posts';

/** 一次请求最多收多少正文（1 MiB 够一篇长笔记，再多就是误贴或攻击） */
const MAX_BODY = 1024 * 1024;
/** 文章地址 = slug：只允许英文小写、数字、连字符，连字符不能在首尾 */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export type SaveResult = { status: number; data: Record<string, unknown> };

/** 今天，写成库里那种 YYYY-MM-DD（全站显示的日期出处仍然只有 posts.ts 的 updatedAt） */
function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const tooLarge = (raw: string) => raw.length > MAX_BODY;

/**
 * 把交上来的 HTML 过一遍：能执行脚本的标签整个扔掉，href/src 里的伪协议抹成 #。
 * 属性名通配（on*）HTMLRewriter 的选择器写不了，那部分由文章页的 CSP 兜：
 * script-src 'self' 之下内联 on* 处理器不会执行（要执行得给 unsafe-inline，我们没给）。
 */
export async function sanitize(html: string): Promise<string> {
  // 伪协议：点一下就执行脚本的链接。⚠ 选择器里不能出现带冒号的属性名
  // （[xlink:href] 会让 HTMLRewriter 的解析器报错），SVG 现在也用普通 href
  const PSEUDO = /^\s*(javascript|data|vbscript):/i;
  const killUrl = (name: string) => ({
    element(el: { getAttribute: (n: string) => string | null; setAttribute: (n: string, v: string) => void }) {
      const value = el.getAttribute(name);
      // ⚠ 不能在遍历 attributes 的当儿改它 —— HTMLRewriter 会直接抛错，所以定点读写
      if (value && PSEUDO.test(value)) el.setAttribute(name, '#');
    },
  });
  const res = new HTMLRewriter()
    .on('script, style, iframe, object, embed, link, meta, base, form', {
      element(el) {
        el.remove();
      },
    })
    .on('[href]', killUrl('href'))
    .on('[src]', killUrl('src'))
    .on('[formaction]', killUrl('formaction'))
    .on('[action]', killUrl('action'))
    .transform(new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
  return await res.text();
}

/**
 * 存一篇文章。mode=new 时 slug 撞上已有文章返回 409；mode=edit 时必须已经存在。
 * 更新只动栏目、标题和正文，发布时间 date 保持原样，并把 updated 写成今天。
 */
export async function savePost(
  db: Db,
  payload: {
    column?: unknown;
    title?: unknown;
    slug?: unknown;
    markdown?: unknown;
    html?: unknown;
  },
  mode: 'new' | 'edit'
): Promise<SaveResult> {
  const column = String(payload.column ?? '');
  const title = String(payload.title ?? '').trim();
  const slug = String(payload.slug ?? '').trim();
  const markdown = String(payload.markdown ?? '').replace(/\r\n/g, '\n').trimEnd();
  const html = String(payload.html ?? '');

  if (!COLUMNS.some((c) => c.slug === column)) {
    return { status: 400, data: { error: '栏目不在注册表里（src/data/columns.ts）' } };
  }
  if (!title) return { status: 400, data: { error: '标题是空的' } };
  if (!SLUG_RE.test(slug)) return { status: 400, data: { error: '地址只能用英文小写、数字和连字符' } };
  if (!markdown) return { status: 400, data: { error: '正文是空的' } };
  if (!html) return { status: 400, data: { error: '没带上排好的正文' } };

  const found = await db
    .prepare('SELECT slug, date, cover, handwritten, depth FROM posts WHERE slug = ?')
    .bind(slug)
    .first();
  const existing = found as
    | { slug: string; date: string; cover: string | null; handwritten: string | null; depth: string | null }
    | null;

  if (mode === 'new' && existing) return { status: 409, data: { error: `${slug} 已经存在，换一个地址` } };
  if (mode === 'edit' && !existing) return { status: 404, data: { error: `${slug} 还没有这篇文章` } };

  const date = existing?.date ?? today();
  const updated = mode === 'edit' ? today() : null;
  const clean = await sanitize(html);

  const meta = db.prepare(
    `INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       column_slug = excluded.column_slug, title = excluded.title, updated = excluded.updated,
       saved_at = excluded.saved_at`
  );
  // 正文的片和元数据的更新在一个事务里：不能出现标题新、正文旧
  await db.batch([
    ...partStatements(db, slug, markdown, clean),
    meta.bind(
      slug,
      column,
      title,
      date,
      updated,
      existing?.cover ?? null,
      existing?.handwritten ?? null,
      existing?.depth ?? null
    ),
  ]);

  return { status: 200, data: { slug, url: `/blog/${slug}/` } };
}

/** 编辑已有文章时回填给写作页的那份数据（标题 + Markdown 原文） */
export async function loadPost(db: Db, slug: string): Promise<SaveResult> {
  const row = await db
    .prepare('SELECT slug, column_slug, title, date, updated FROM posts WHERE slug = ?')
    .bind(slug)
    .first();
  if (!row) return { status: 404, data: { error: `还没有 ${slug} 这篇文章` } };
  return { status: 200, data: { ...(row as Record<string, unknown>), body_md: await readBody(db, slug, 'md') } };
}
