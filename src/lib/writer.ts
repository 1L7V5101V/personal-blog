/**
 * 站上写作的后端规则：正文收不收、收下来存成什么样。
 * 排版不在这里 —— 那一步永远在浏览器里跑 src/lib/render.ts。
 *
 * ⚠ 为什么排版不放在服务端：Workers Free 计划每个 HTTP 请求只有 10ms CPU，超了就
 *   返回 Error 1102。实测排一篇 0.2KB 的短文要 29ms，那篇 21.6KB 的长笔记要 675ms。
 *   所以收下来的是 Markdown 源文，存进去也只有这一份；文章页把源文交给**读者的浏览器**
 *   现排，写作台交给**作者的浏览器**现排 —— 两处调的是同一份代码。
 * ⚠ 代价：能排进正文的东西由源文里写了什么决定，而源文里的原始 HTML 会照原样排出来
 *   （`allowDangerousHtml` 是排版对齐 Astro 那条管线所必需的）。所以这里的信任前提
 *   只有一条、而且比过去更吃重：**能写的必须是过了 Access 的你**。兜底是文章页那条
 *   `Content-Security-Policy: script-src 'self'` —— 不给 unsafe-inline 也不给 unsafe-hashes，
 *   所以内联脚本、on 开头的内联事件属性、javascript: 伪协议链接在读者那边都不执行。
 *   HTML 入库前不再净洗：库里存的是源文，没有一份「排好的 HTML」可以洗了。
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
  },
  mode: 'new' | 'edit'
): Promise<SaveResult> {
  const column = String(payload.column ?? '');
  const title = String(payload.title ?? '').trim();
  const slug = String(payload.slug ?? '').trim();
  const markdown = String(payload.markdown ?? '').replace(/\r\n/g, '\n').trimEnd();

  if (!COLUMNS.some((c) => c.slug === column)) {
    return { status: 400, data: { error: '栏目不在注册表里（src/data/columns.ts）' } };
  }
  if (!title) return { status: 400, data: { error: '标题是空的' } };
  if (!SLUG_RE.test(slug)) return { status: 400, data: { error: '地址只能用英文小写、数字和连字符' } };
  if (!markdown) return { status: 400, data: { error: '正文是空的' } };

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

  const meta = db.prepare(
    `INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       column_slug = excluded.column_slug, title = excluded.title, updated = excluded.updated,
       saved_at = excluded.saved_at`
  );
  // 正文的片和元数据的更新在一个事务里：不能出现标题新、正文旧
  await db.batch([
    ...partStatements(db, slug, markdown),
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
  return { status: 200, data: { ...(row as Record<string, unknown>), body_md: await readBody(db, slug) } };
}
