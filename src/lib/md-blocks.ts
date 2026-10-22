/**
 * Markdown 的顶层块边界 —— 全站只有这一份切块规则。
 *
 * 谁在用：
 *   `render.ts` 按它一块一块排（整篇输出就是这些块拼起来）；
 *   写作台按它决定「光标在哪一块」，那一块露出源文。
 * 两处必须一字不差地同一条规则，否则「这一块的源文」和「这一块排出来的样子」对不上号。
 * 单独成一个模块（而不是留在 render.ts 里）还有个实际好处：写作台的打字机面孔只量边界、
 * 不排版，于是永远不用去拉那份 768KB 的排版包。
 */
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

/** 只到「拿到顶层块的区间」这一步：gfm 认表格、math 认公式块，都会改变块的结构 */
const split = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

/** HTML 的空元素：它们没有闭合标签，不能拿它们算嵌套 */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** 数标签：close=true 数 `</name>`，否则数 `<name …>`（`<name/>` 那种自闭合不算开） */
function countTags(html: string, name: string, close: boolean): number {
  const esc = name.replace(/[^\w-]/g, '');
  if (close) return (html.match(new RegExp(`<\\s*/\\s*${esc}\\s*>`, 'gi')) ?? []).length;
  const starts = (html.match(new RegExp(`<\\s*${esc}(?=[\\s/>])`, 'gi')) ?? []).length;
  const selfClose = (html.match(new RegExp(`<\\s*${esc}\\b[^<>]*/>`, 'gi')) ?? []).length;
  return starts - selfClose;
}

/** 这一块 HTML 开了一个自己没关掉的标签吗？返回那个标签名；注释和空元素算没有 */
function openedTag(html: string): string | null {
  const m = /<\s*([a-zA-Z][\w-]*)/.exec(html);
  if (!m) return null;
  const name = m[1].toLowerCase();
  if (VOID_TAGS.has(name)) return null;
  return countTags(html, name, false) > countTags(html, name, true) ? name : null;
}

export type MdBlock = { source: string; start: number; end: number };

/**
 * 顶层块的区间：块尾把后面的空行一起吃进来，这样区间首尾相接、拼回去不丢字。
 *
 * ⚠ 唯一的例外是**没闭合的原始 HTML**：`<div>` 后面跟一个空行，CommonMark 就把这个
 *   `<div>` 单独当成一块，闭合的 `</div>` 落在后面另一块里。整篇排时 rehype-raw 重新解析
 *   整棵树，中间那些块会被套进这个 div；一块一块排就套不进去（div 自己空闭掉）。
 *   所以这种块要一直往后并，直到那个标签收支平衡为止 —— 不然就地排版和整篇排就是两种结果。
 *   （那 7 篇踩不到：排行表是生成器写的，块内就闭合了。人手工写 HTML 会踩到。）
 */
export function splitBlocks(markdown: string): MdBlock[] {
  const root = split.runSync(split.parse(markdown));
  const kids = root.children;
  const from = (i: number) => kids[i]?.position?.start.offset ?? 0;
  const upto = (i: number) =>
    i + 1 < kids.length ? kids[i + 1].position?.start.offset ?? markdown.length : markdown.length;

  const out: MdBlock[] = [];
  for (let i = 0; i < kids.length; i++) {
    let last = i;
    const tag = kids[i].type === 'html' ? openedTag(String(kids[i].value ?? '')) : null;
    if (tag) {
      let depth = 0;
      for (let j = i; j < kids.length; j++) {
        const text = markdown.slice(from(j), upto(j));
        depth += countTags(text, tag, false) - countTags(text, tag, true);
        last = j;
        if (depth <= 0 && j > i) break;
      }
    }
    const start = from(i);
    const end = upto(last);
    out.push({ source: markdown.slice(start, end), start, end });
    i = last;
  }
  return out.length ? out : [{ source: markdown, start: 0, end: markdown.length }];
}
