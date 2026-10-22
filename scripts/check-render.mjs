/**
 * 排版一致性对照仪器：src/lib/render.ts 的输出 vs Astro 自己那条管线
 * （@astrojs/markdown-remark + astro.config.mjs 里那几个插件）。
 * 两者都在 Node 里跑，逐篇比 whitespace 归一化后的字符串。
 *
 * ⚠ render.ts 现在只有一条路径：整篇输出 = 按顶层块切开排好再拼起来。
 *   所以这台仪器同时在验「分块 == 整篇」—— Astro 那边永远是一整篇排的。
 *   CASES 里那些是 7 篇文章盖不到的构造，尤其**跨块的同名标题**：
 *   序号必须整篇数一遍才对，一块一个 slugger 就会发出两个一样的 id。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { createRenderer } from '../src/lib/render.ts';

const astroProc = await createMarkdownProcessor({
  remarkPlugins: [remarkGfm, remarkMath],
  rehypePlugins: [rehypeKatex],
  shikiConfig: { theme: 'github-light' },
});
const mine = await createRenderer();

const strip = (raw) => {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  return lines.slice(lines.indexOf('---', 1) + 1).join('\n').trimEnd();
};
const norm = (s) => s.replace(/\s+/g, ' ');

/** 语料那 7 篇盖不到的构造，一条条点名 */
const CASES = [
  {
    name: '跨块同名标题 ×2',
    body: '## 安装\n\n先装依赖。\n\n## 安装\n\n再装插件。\n',
  },
  {
    name: '跨块同名标题 ×3 带中文',
    body: '# 概览\n\n甲\n\n# 概览\n\n乙\n\n# 概览\n\n丙\n',
  },
  {
    name: '标题带行内代码与公式',
    body: '# 用 `npm run dev` 起 $\\alpha$ 这一档\n\n正文\n\n## 用 `npm run dev` 起 $\\alpha$ 这一档\n\n又一段\n',
  },
  {
    name: '原始 HTML 紧贴标题与列表',
    body: '<div class="box">\n\n# 盒里的标题\n\n- 一\n- 二\n\n</div>\n\n## 盒外\n',
  },
  {
    name: 'loose 列表与嵌套',
    body: '- 甲\n\n  甲的补充\n\n- 乙\n\n1. 一\n2. 二\n\n# 标题\n',
  },
  {
    name: 'fence 别名与表外语言',
    body: '```js\nconst a = 1;\n```\n\n```typescript\nconst b: number = 2;\n```\n\n```notalanguage\nhello\n```\n\n```\n无语言\n```\n',
  },
  {
    name: 'setext 标题与表格与分隔线',
    body: '一段\n\n标题甲\n=====\n\n| 一 | 二 |\n|---|---|\n| 1 | 2 |\n\n---\n\n标题乙\n-----\n',
  },
  {
    name: '块级公式独立成块',
    body: '前一段\n\n$$\n\\int_0^1 x^2\\,dx = \\tfrac13\n$$\n\n后一段\n',
  },
];

let bad = 0;
const run = async (name, body) => {
  const a = norm(await mine.render(body));
  const b = norm((await astroProc.render(body)).code);
  const verdict = a === b ? '一致' : '不一致';
  if (a !== b) bad++;
  console.log(`${name.padEnd(34)} ${String(a.length).padStart(7)} vs ${String(b.length).padStart(7)}  ${verdict}`);
  if (a !== b) {
    let i = 0;
    while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.log('   首个不同处在', i);
    console.log('   render.ts :', JSON.stringify(a.slice(Math.max(0, i - 40), i + 160)));
    console.log('   Astro     :', JSON.stringify(b.slice(Math.max(0, i - 40), i + 160)));
  }
};

for (const name of readdirSync('src/content/blog').sort()) {
  if (!name.endsWith('.md')) continue; // mdx 那篇嵌了组件，两边都排不了
  await run(name, strip(readFileSync(`src/content/blog/${name}`, 'utf8')));
}
for (const c of CASES) await run(`用例 · ${c.name}`, c.body);

console.log(bad === 0 ? '\n全部一致' : `\n${bad} 处不一致`);
process.exitCode = bad === 0 ? 0 : 1;
