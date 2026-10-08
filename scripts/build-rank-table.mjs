/**
 * 把「六家综合排行」那张表从数据写进文章里。
 *
 *   node scripts/build-rank-table.mjs && node scripts/import-posts.mjs
 *
 * 读 src/data/six-ranking.ts，生成那张 11 列表的原始 HTML，替换掉文章里
 * 「rank:begin」「rank:end」两条注释之间的那一段。断言（六家频次之和 = 总频次、
 * 非 0 公司数 = 家数）在 src/lib/rank-table.ts 里跑，录错一行这个脚本直接抛错。
 *
 * 为什么要生成进文章、而不是文章里嵌组件：站上写的正文只能由浏览器里的
 * src/lib/render.ts 排，那条路没有构建期组件。表变成正文里的一段原始 HTML 之后，
 * 这一篇也能在站上编辑，排版也仍然只有一份实现。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { COS, ROWS } from '../src/data/six-ranking.ts';
import { rankTableHtml } from '../src/lib/rank-table.ts';

const MD = 'src/content/blog/six-companies-ranking.md';
const BEGIN = '<!-- rank:begin -->';
const END = '<!-- rank:end -->';

let src = readFileSync(MD, 'utf8');
if (!src.includes(BEGIN)) src = src.trimEnd() + `\n\n${BEGIN}\n${END}\n`;

const table = rankTableHtml(COS, ROWS);
const next = src.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), `${BEGIN}\n${table}\n${END}`);

writeFileSync(MD, next, 'utf8');
console.log(`${MD}\n表体按 ${ROWS.length} 行数据重写，${(table.length / 1024).toFixed(1)} KB`);
