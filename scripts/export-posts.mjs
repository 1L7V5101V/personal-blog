/**
 * 把 D1 里的文章导回 src/content/blog/*.md —— 备份用。
 *
 *   node scripts/export-posts.mjs              导本地库
 *   node scripts/export-posts.mjs --remote     导线上库
 *
 * ⚠ 线上（D1）是文章唯一的出处，这些 .md 是备份和种子素材。导出来会盖掉同名文件，
 *   所以：**先在仓库干净的状态下导，再提交**，别把没保存的本地改动冲了。
 *   库里有、文件里没有的 slug 会新建；文件里有、库里没有的只会报出来，不删
 *   （要连删除一起做就加 --prune，自己先看一眼报的是什么）。
 *
 * 标题一律加引号存（JSON 的字符串语法本身就是合法的 YAML 双引号标量），
 * 所以第一次导的时候每个文件的 frontmatter 都会重排一遍，之后就不动了。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join} from 'node:path';

// wrangler 的 exports 地图不让人 require.resolve 它的 bin，按相对路径直接指过去
// （比起 npx 干净：不用 shell:true，也就没有「参数只拼接不转义」那条警告）
const WRLANGLER = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const DIR = 'src/content/blog';
const remote = process.argv.includes('--remote');
const prune = process.argv.includes('--prune');

// 走 --file 而不是 --command：SQL 里的引号不用管 shell 转义
function query(sql) {
  const file = join(tmpdir(), 'blog-export-query.sql');
  writeFileSync(file, sql, 'utf8');
  const out = execFileSync(
    process.execPath,
    [WRLANGLER, 'd1', 'execute', 'blog', remote ? '--remote' : '--local', '--file', file, '--json'],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] }
  );
  const parsed = JSON.parse(out);
  return (Array.isArray(parsed) ? parsed[0] : parsed).results ?? [];
}

const rows = query(
  'SELECT slug, column_slug, title, date, updated, cover, handwritten, depth FROM posts ORDER BY slug'
);
const parts = query('SELECT slug, kind, idx, body FROM post_parts ORDER BY slug, kind, idx');
if (rows.length === 0) throw new Error('库里一篇文章都没有，先跑 migrations');

const body = new Map();
for (const p of parts) {
  const key = `${p.slug}\u0000${p.kind}`;
  body.set(key, (body.get(key) ?? '') + p.body);
}

const line = (k, v) => (v ? `${k}: ${v}` : null);
const written = [];
const same = [];
for (const r of rows) {
  const fm = [
    '---',
    `title: ${JSON.stringify(r.title)}`,
    line('date', r.date),
    line('updated', r.updated),
    line('column', r.column_slug),
    line('cover', r.cover),
    line('handwritten', r.handwritten ? JSON.stringify(r.handwritten) : null),
    line('depth', r.depth),
    '---',
    '',
  ].filter((l) => l !== null);
  const md = fm.join('\n') + (body.get(`${r.slug}\u0000md`) ?? '').trimEnd() + '\n';
  const file = `${DIR}/${r.slug}.md`;
  if (existsSync(file) && readFileSync(file, 'utf8') === md) same.push(r.slug);
  else {
    writeFileSync(file, md, 'utf8');
    written.push(r.slug);
  }
}

const slugs = new Set(rows.map((r) => r.slug));
const orphans = readdirSync(DIR).filter((f) => /\.(md|mdx)$/.test(f) && !slugs.has(f.replace(/\.(md|mdx)$/, '')));
for (const f of orphans) {
  if (prune) unlinkSync(`${DIR}/${f}`);
}

console.log(`库 ${rows.length} 篇 → ${DIR}/`);
console.log(`重写 ${written.length}：${written.join(', ') || '无'}`);
console.log(`没变 ${same.length}`);
if (orphans.length) console.log(`文件里有、库里没有：${orphans.join(', ')}${prune ? '（已删）' : '（没动，要删加 --prune）'}`);
