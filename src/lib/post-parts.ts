/**
 * 正文（只有 Markdown 了）的分片读写。
 *
 * ⚠ 为什么要切片：D1 一个值最多约 100,000 字节（本地实测 98,304 过、100,352 报
 *   SQLITE_TOOBIG），上限按 UTF-8 **字节**数算，中文一个字占三个字节，所以不能按字符数切。
 *   现在库里最长的源文 28.2KB（那份排行表），一片就装得下 —— 留着切片是因为一篇
 *   三万字的中文长笔记就是 90KB 字节，到那天不用改这套代码。
 * ⚠ 以前这里按 kind 存 md 和 html 两份，排好的 HTML 由写作页排好交上来、文章页直接吐。
 *   现在只存源文，文章页在读者浏览器里用 src/lib/render.ts 现排（见 0003 那条迁移）。
 */
import type { Db } from './posts';

/** 一片最多多少字节（离 100,000 留足余量：语句本身和引号转义都算长度） */
export const PART_MAX_BYTES = 40_000;

const byteLenOf = (ch: string): number => {
  const cp = ch.codePointAt(0)!;
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp > 0xffff ? 4 : 3;
};

/** 按码点切，绝不把一对代理项（emoji 这类）劈成两半 */
export function splitChunks(text: string, max = PART_MAX_BYTES): string[] {
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of text) {
    const b = byteLenOf(ch);
    if (curBytes + b > max) {
      out.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * 写好一篇正文所需的语句：先清掉旧片，再按 idx 插新的。
 * 交回语句而不是直接执行 —— 调用方把它们和 posts 表的 upsert 放进一个 batch，
 * 一个事务里要么全成要么全不成，不会出现「标题改了、正文还是旧的」。
 */
export function partStatements(db: Db, slug: string, markdown: string): unknown[] {
  const stmts: unknown[] = [db.prepare('DELETE FROM post_parts WHERE slug = ?').bind(slug)];
  splitChunks(markdown).forEach((body, idx) => {
    stmts.push(db.prepare('INSERT INTO post_parts (slug, idx, body) VALUES (?, ?, ?)').bind(slug, idx, body));
  });
  return stmts;
}

export async function readBody(db: Db, slug: string): Promise<string> {
  const { results } = await db
    .prepare('SELECT body FROM post_parts WHERE slug = ? ORDER BY idx')
    .bind(slug)
    .all();
  return results.map((r) => r.body ?? '').join('');
}
