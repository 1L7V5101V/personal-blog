/**
 * 排版一致性对照仪器：src/lib/render.ts 的输出 vs Astro 自己那条管线
 * （@astrojs/markdown-remark + astro.config.mjs 里那几个插件）。
 * 两者都在 Node 里跑，逐篇比 whitespace 归一化后的字符串。
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

let bad = 0;
for (const name of readdirSync('src/content/blog').sort()) {
  if (!name.endsWith('.md')) continue; // mdx 那篇嵌了组件，两边都排不了
  const body = strip(readFileSync(`src/content/blog/${name}`, 'utf8'));
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
}
console.log(bad === 0 ? '\n全部一致' : `\n${bad} 篇不一致`);
