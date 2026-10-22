/**
 * 就地排版这台仪器问的是**复用**：写作台每改一次只重量变化的那块，
 * 拿着上一次结果增量排出来的整篇，和冷排一整篇是不是一字不差。
 *
 * 「每块都重排」那条路已经被 check-render.mjs 盖住了（Astro 那边永远整篇排），
 * 这里要盯的是增量那条：打字是一步一步来的，标题序号会往前后面的块传播，
 * 插一个标题进去，后面所有同名标题的 id 都要跟着挪 —— 复用要是把这条漏掉，
 * 纸上就会和读者浏览器里排出来的不一样。
 *
 * 四条回放：逐块打出来、中途插同名标题、改早先那块、删掉一块。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { splitBlocks } from '../src/lib/md-blocks.ts';
import { createRenderer } from '../src/lib/render.ts';

const mine = await createRenderer();

const strip = (raw) => {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  return lines.slice(lines.indexOf('---', 1) + 1).join('\n');
};
const norm = (s) => s.replace(/\s+/g, ' ');

/** 顶层块的源文：直接用产品那一条规则（src/lib/md-blocks.ts）。
    这里再抄一份只会测出「两份实现彼此一致」，测不出产品对不对 */
const sources = (md) => splitBlocks(md).map((b) => b.source);

let bad = 0;
/** 增量回放：每走一步都拿 prev 复用一次，并和那一步的冷排比 */
async function replay(label, steps) {
  let state;
  let prevHtml = null;
  for (let n = 0; n < steps.length; n++) {
    const md = steps[n];
    const t0 = performance.now();
    const got = await mine.renderDoc(md, state);
    const incMs = performance.now() - t0;
    state = got;
    const cold = await mine.render(md);
    const a = norm(got.html).trim();
    const b = norm(cold).trim();
    if (a !== b) {
      bad++;
      let i = 0;
      while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
      console.log(`   ✗ ${label} 第 ${n + 1} 步不一致 @${i}`);
      console.log('     增量 :', JSON.stringify(a.slice(Math.max(0, i - 70), i + 140)));
      console.log('     冷排 :', JSON.stringify(b.slice(Math.max(0, i - 70), i + 140)));
      return;
    }
    prevHtml = a;
    if (n === steps.length - 1) {
      console.log(`   ✓ ${label}（${steps.length} 步，末步 ${incMs.toFixed(1)}ms 排 ${got.blocks.length} 块）`);
    }
  }
}

/** 每块之后停一下：就是「一个字一个字把段落敲完」的样子 */
const byBlocks = (md) => {
  const list = sources(md);
  const out = [];
  for (let i = 1; i <= list.length; i++) out.push(list.slice(0, i).join(''));
  return out;
};

for (const name of readdirSync('src/content/blog').sort()) {
  if (!name.endsWith('.md')) continue;
  const body = strip(readFileSync(`src/content/blog/${name}`, 'utf8'));
  const list = sources(body);
  console.log(`${name}（${list.length} 块）`);
  await replay('逐块打出来', byBlocks(body));

  // 在最前面插一个和现有标题同名的标题：后面每一个同名标题的序号都要往后挪一位
  const firstHead = list.find((s) => /^#{1,6} /.test(s.trim()));
  if (firstHead) {
    const text = firstHead.trim().replace(/^#{1,6} /, '');
    const inserted = `# ${text}\n\n引子一段。\n\n` + body;
    await replay('开头插一个同名标题', [body, inserted]);
    await replay('再把插进去的那个删掉', [body, inserted, body]);
  }

  // 改中间那块：只该重排它，序号不变
  const mid = Math.floor(list.length / 2);
  const edited = [...list];
  edited[mid] = edited[mid].replace(/\n+$/, '') + '\n';
  edited[mid] = edited[mid] + '补一句。\n\n';
  await replay(`改第 ${mid + 1} 块`, byBlocks(body).slice(0, mid).concat(edited.join('')));
}

// 独立的小用例：中文与代码混着，同名标题三连
await replay('同名标题三连逐步出现', [
  '# 概览\n\n甲\n\n',
  '# 概览\n\n甲\n\n# 概览\n\n乙\n\n',
  '# 概览\n\n甲\n\n# 概览\n\n乙\n\n# 概览\n\n丙\n\n',
]);
await replay('代码块改语言名', [
  '```js\nconst a = 1;\n```\n\n正文\n\n',
  '```javascript\nconst a = 1;\n```\n\n正文\n\n',
  '```notalanguage\nconst a = 1;\n```\n\n正文\n\n',
]);

console.log(bad === 0 ? '\n增量复用与冷排逐字符一致' : `\n${bad} 处不一致`);
process.exitCode = bad === 0 ? 0 : 1;
