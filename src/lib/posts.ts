/**
 * 文章的取数与排序。所有页面要「更新时间」和「日期字符串」都走这里，
 * 免得同一个规则在各页各写一遍。
 */
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { columnOf } from '../data/columns';

export type Post = CollectionEntry<'blog'>;

/**
 * 一篇文章的最后更新时间。
 * frontmatter 写了 updated 就用它，没写就退回发布时间 date。
 * 将来站上编辑器保存正文时就改这个 updated，列表顺序自己跟着变。
 */
export const updatedAt = (p: Post): Date => p.data.updated ?? p.data.date;

/** 更新时间倒序：新的在前 */
export const byUpdatedDesc = (a: Post, b: Post) =>
  updatedAt(b).valueOf() - updatedAt(a).valueOf();

export const allPosts = async (): Promise<Post[]> =>
  (await getCollection('blog')).sort(byUpdatedDesc);

/** 某个栏目下的文章（继承 allPosts 的倒序） */
export const postsIn = (posts: Post[], slug: string): Post[] =>
  posts.filter((p) => p.data.column === slug);

/**
 * 栏目 slug → 栏目名。
 * 文章写了注册表里没有的 slug，构建期就抛错 —— 这样不会有一篇文章静默落在
 * 一个不存在的栏目里，谁都找不到它。
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
