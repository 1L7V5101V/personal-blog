/**
 * 一次性种子：把 src/content/blog 里的文章灌成 migrations/0002_seed_posts.sql。
 *
 *   node scripts/import-posts.mjs        只生成 SQL
 *   然后 npx wrangler d1 migrations apply blog --local / --remote
 *
 * 正文 HTML 全部由 src/lib/render.ts 排 —— 和写作页预览、线上新建的文章同一份实现。
 * 「六家综合排行」那张 11 列表先由 scripts/build-rank-table.mjs 从数据写成正文里的
 * 原始 HTML，所以它也只是普通 .md，没有构建期组件那条特例。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { COLUMNS } from '../src/data/columns.ts';
import { splitChunks } from '../src/lib/post-parts.ts';
import { createRenderer } from '../src/lib/render.ts';

const BLOG_DIR = 'src/content/blog';
const OUT = 'migrations/0002_seed_posts.sql';
const KNOWN_KEYS = new Set(['title', 'date', 'updated', 'column', 'cover', 'handwritten', 'depth']);

function parse(raw, file) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') throw new Error(`${file}: 没有 frontmatter`);
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error(`${file}: frontmatter 没有收尾的 ---`);
  const data = {};
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`${file}: frontmatter 里看不懂这一行：${line}`);
    if (!KNOWN_KEYS.has(m[1])) throw new Error(`${file}: 未知字段 ${m[1]}（这一列不在 KNOWN_KEYS 里）`);
    data[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return { data, body: lines.slice(end + 1).join('\n') };
}

const quoted = (v) => (v === undefined || v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

/** 正文一行塞不下（D1 单值上限约 100,000 字节），按片写成多条 INSERT */
function partInserts(slug, kind, text) {
  return splitChunks(text)
    .map((body, idx) =>
      `INSERT INTO post_parts (slug, kind, idx, body) VALUES (${quoted(slug)}, ${quoted(kind)}, ${idx}, ${quoted(body)});`
    )
    .join('\n');
}

const renderer = await createRenderer();
const rows = [];

for (const name of readdirSync(BLOG_DIR).sort()) {
  if (!name.endsWith('.md')) continue;
  const slug = name.slice(0, -3);
  const { data, body } = parse(readFileSync(`${BLOG_DIR}/${name}`, 'utf8'), name);
  if (!COLUMNS.some((c) => c.slug === data.column)) {
    throw new Error(`${name}: 栏目 "${data.column}" 不在 src/data/columns.ts 的注册表里`);
  }
  const markdown = body.trimEnd();
  const html = await renderer.render(markdown);
  rows.push({ slug, data, markdown, html });
  console.log(`${slug}\t${(html.length / 1024).toFixed(1)} KB html\t${(markdown.length / 1024).toFixed(1)} KB md`);
}

const sql = [
  '-- 由 scripts/import-posts.mjs 生成，别手改：要改正文就改 src/content/blog 再重新生成。',
  ...rows.flatMap((r) => [
    `-- ${r.slug}`,
    `DELETE FROM post_parts WHERE slug = ${quoted(r.slug)};`,
    partInserts(r.slug, 'md', r.markdown),
    partInserts(r.slug, 'html', r.html),
    [
      'INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)',
      'VALUES (',
      [
        quoted(r.slug),
        quoted(r.data.column),
        quoted(r.data.title),
        quoted(r.data.date),
        quoted(r.data.updated),
        quoted(r.data.cover),
        quoted(r.data.handwritten),
        quoted(r.data.depth),
      ].join(',\n'),
      ') ON CONFLICT(slug) DO UPDATE SET',
      '  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,',
      '  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,',
      '  depth = excluded.depth;',
    ].join('\n'),
  ]),
].join('\n\n');

writeFileSync(OUT, sql, 'utf8');
console.log(`\n${rows.length} 篇 → ${OUT}（${(sql.length / 1024).toFixed(0)} KB）`);
