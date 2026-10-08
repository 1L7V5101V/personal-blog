/**
 * 文章的取数与排序。线上唯一的出处是 D1 里的 posts 表，列名就是原来 frontmatter 的字段名。
 * 列表页只要目录信息，所以分成两个查询：读列表不带 body_html（那篇长文的正文有 700KB），
 * 读单篇才带。
 */
import { columnOf } from '../data/columns';
import { readBody, type PartKind } from './post-parts';

/** D1 里除去正文的那部分（列表、首页卡片、栏目页用这个就够） */
export type PostMeta = {
  slug: string;
  column: string;
  title: string;
  date: Date;
  updated: Date | null;
  cover: string | null;
  handwritten: string | null;
  depth: string | null;
};

/** 正文按需求取：列表页不取，文章页只取 HTML，写作页只取 Markdown */
export type Post = PostMeta & {
  bodyMd: string;
  bodyHtml: string;
};

/** 用到的那部分 D1 API（不想为了类型去装 @cloudflare/workers-types） */
export type Db = {
  prepare: (sql: string) => {
    bind: (...values: unknown[]) => {
      all: () => Promise<{ results: Record<string, string | null>[] }>;
      first: () => Promise<Record<string, string | null> | null>;
      run: () => Promise<unknown>;
    };
  };
  /** 一批语句在一个事务里跑 */
  batch: (statements: unknown[]) => Promise<unknown>;
};

const META_COLUMNS =
  'slug, column_slug AS column, title, date, updated, cover, handwritten, depth';

/** frontmatter 里那种 YYYY-MM-DD 按本地零点数解析，和 z.coerce.date() 原来的行为一致 */
const toDay = (v: string | null): Date | null => (v ? new Date(`${v}T00:00:00`) : null);
const toPost = (r: Record<string, string | null>): Post => ({
  slug: r.slug as string,
  column: r.column as string,
  title: r.title as string,
  date: toDay(r.date) as Date,
  updated: toDay(r.updated),
  cover: r.cover ?? null,
  handwritten: r.handwritten ?? null,
  depth: r.depth ?? null,
  bodyMd: (r.body_md as string) ?? '',
  bodyHtml: (r.body_html as string) ?? '',
});

/**
 * 一篇文章的最后更新时间。
 * 写了 updated 就用它，没写就退回发布时间 date。全站显示的日期都走这一个规则。
 */
export const updatedAt = (p: PostMeta): Date => p.updated ?? p.date;

/** 更新时间倒序：新的在前 */
export const byUpdatedDesc = (a: PostMeta, b: PostMeta) =>
  updatedAt(b).valueOf() - updatedAt(a).valueOf();

/** 全部文章的目录信息，倒序 */
export const allPosts = async (db: Db): Promise<PostMeta[]> => {
  const { results } = await db
    .prepare(`SELECT ${META_COLUMNS} FROM posts ORDER BY date DESC`)
    .all();
  return results.map(toPost).sort(byUpdatedDesc);
};

/**
 * 单篇。`need` 决定取哪份正文（正文是分片存的，取一次要按 idx 拼回来）。
 * 库里没有这篇就返回 null，页面自己处理。
 */
export const postBySlug = async (
  db: Db,
  slug: string,
  need: PartKind | 'both' = 'html'
): Promise<Post | null> => {
  const row = await db.prepare(`SELECT ${META_COLUMNS} FROM posts WHERE slug = ?`).bind(slug).first();
  if (!row) return null;
  const post = toPost(row);
  if (need === 'html' || need === 'both') post.bodyHtml = await readBody(db, slug, 'html');
  if (need === 'md' || need === 'both') post.bodyMd = await readBody(db, slug, 'md');
  return post;
};

/** 某个栏目下的文章（继承 allPosts 的倒序） */
export const postsIn = <T extends PostMeta>(posts: T[], slug: string): T[] =>
  posts.filter((p) => p.column === slug);

/**
 * 栏目 slug → 栏目名。
 * 注册表里查不到就抛错 —— 不会有一篇文章静默落在一个不存在的栏目里，谁都找不到它。
 */
export const columnName = (slug: string): string => {
  const c = columnOf(slug);
  if (!c) {
    throw new Error(
      `栏目 "${slug}" 不存在。栏目只在 src/data/columns.ts 里定义，去那里加一行。`
    );
  }
  return c.name;
};

export const fmtDate = (d: Date): string =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`;
