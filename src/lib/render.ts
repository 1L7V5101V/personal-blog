/**
 * 全站唯一的 Markdown 排版出口。现在有三个地方跑它，跑的都是同一份代码：
 *   ① 写作台（就地排版：光标离开哪一块就只重量哪一块，其余块用上次的结果）
 *   ② 文章页（读者在自己浏览器里把库里的 Markdown 现排）
 *   ③ 种子脚本（Node 里把现有文章灌进 D1）
 *
 * ⚠ 它只有**一条**排版路径：整篇输出就是「按顶层块切开排好再拼起来」。
 *   以前写作台排整篇、文章页吃存好的 HTML，两边靠人保证一致；现在写作台和读者侧调的是
 *   同一个函数，一致由结构本身保证。前提「分块 == 整篇」由 node scripts/check-blocks.mjs
 *   盯着（7 篇逐字符比对，含同名标题跨块的序号连续）。
 * ⚠ 它复刻的是 Astro 那条 unified 管线，不是另一套风格：插件顺序、shiki 主题、KaTeX
 *   输出逐项照 Astro 抄。改排版配置就改这里，改完跑 npm run render:check 对照。
 * ⚠ 不能直接用 @astrojs/markdown-remark 的 createMarkdownProcessor：那个包要 node:path /
 *   node:url / node:module，导不进浏览器。
 */
import Slugger from 'github-slugger';
import { toText } from 'hast-util-to-text';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubLight from 'shiki/themes/github-light.mjs';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import { removePosition } from 'unist-util-remove-position';
import { visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';
import { unified } from 'unified';
import { splitBlocks } from './md-blocks.ts';

const THEME = 'github-light';

/**
 * fence 里写的语言 → 那个语法，**用到才取**。
 * ⚠ 每一条都必须是写死的 import 说明符：打包器据此把每个语法切成独立 chunk，文章里没出现
 *   的语言就不进读者那次下载。这个站全部代码块只用上 glsl / js / astro，另外 24 个语法
 *   实测 1.7MB，白背着。拼一个变量出来（`import('@shikijs/langs/' + name)`）会把 347 个
 *   语法全拖进模块图，等于回到老问题，rolldown 在依赖预扫描时还会反复分配失败。
 * ⚠ 表外的名字（包括打错的语言）按纯文本排，不报错。
 */
const GRAMMAR: Record<string, () => Promise<{ default: unknown }>> = {
  astro: () => import('shiki/langs/astro.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  glsl: () => import('shiki/langs/glsl.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  jsonc: () => import('shiki/langs/jsonc.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  powershell: () => import('shiki/langs/powershell.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
  wgsl: () => import('shiki/langs/wgsl.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
};
/** fence 里的简称 → 表里的正名 */
const ALIAS: Record<string, string> = {
  js: 'javascript',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  sh: 'shellscript',
  shell: 'shellscript',
  ts: 'typescript',
};
/** Astro 的 shiki 跳过哪些语言（值来自 @astrojs/internal-helpers 的 defaultExcludeLanguages） */
const EXCLUDE_LANGS = ['math'];
/** ```js 会被 remark-rehype 变成 <code class="language-js">，语言从这个类名读 */
const LANGUAGE_RE = /\blanguage-(\S+)\b/;

type Element = any;

/** 一块：它的源文和排好的 HTML */
export type RenderedBlock = { source: string; html: string };

/** 排版引擎之外，写作台还要这两样：块边界，和块里每段文字的源文位置（见 desk-paper.ts） */
export type MarkdownRenderer = {
  /** 整篇排好：文章页读者侧、种子脚本走这条 */
  render: (markdown: string) => Promise<string>;
  /** 按顶层块排好，并交出可复用的中间状态：写作台走这条 */
  renderDoc: (markdown: string, prev?: DocState) => Promise<RenderedDoc>;
};

/** 上一次排版留下的中间状态。写作台攥着它，下一次只重量变了的那块 */
export type DocEntry = {
  source: string;
  /** 排好但**还没补标题 id** 的那棵树：留着是为了序号变了能重贴，而不必重跑 shiki / KaTeX */
  tree: Element;
  /** 这一块的标题文本，按文档顺序；源码自带的 id 记在 preset 里 */
  heads: { text: string; preset: string | null }[];
  ids: string[];
  html: string | null;
};

export type DocState = { entries: DocEntry[] };

export type RenderedDoc = DocState & { html: string; blocks: RenderedBlock[] };

let highlighter: Promise<any> | null = null;

/** shiki 建一次就留着：首建要解析主题，每次按键都建一遍太贵。语法不在这里预加载 */
function getHighlighter(): Promise<any> {
  highlighter ??= createHighlighterCore({
    themes: [githubLight],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

/** 已经取进 shiki 的语法正名 */
const taken = new Set<string>();

async function takeGrammars(names: Iterable<string>) {
  const shiki = await getHighlighter();
  for (const name of names) {
    if (taken.has(name)) continue;
    await shiki.loadLanguage((await GRAMMAR[name]!()).default as never);
    taken.add(name);
  }
}

/** fence 里写的名字是不是这张表认的 */
function known(written: string): boolean {
  return !!GRAMMAR[ALIAS[written] ?? written];
}

/**
 * fence 里写的名字 → shiki 认的正名；表外的一律纯文本。
 * ⚠ data-language 要留**原名**：Astro 就是这么写的（```js 得到 data-language="js"，
 *   不是 "javascript"），换成正名这台仪器就报不一致。
 */
function grammarOf(written: string): string {
  if (written === 'plaintext') return 'plaintext';
  return ALIAS[written] ?? (GRAMMAR[written] ? written : 'plaintext');
}

/** 把每个 ``` 代码块换成 shiki 排好的节点，行为对齐 Astro 的 rehype-shiki */
function rehypeShiki() {
  return async (tree: Element) => {
    const blocks: { code: Element; written: string; pre: Element; parent: Element }[] = [];
    visitParents(tree, { type: 'element', tagName: 'code' }, (node: Element, ancestors: Element[]) => {
      const pre = ancestors.at(-1);
      if (pre?.type !== 'element' || pre.tagName !== 'pre' || pre.children.length !== 1) return;
      let match: RegExpExecArray | null = null;
      const classList: unknown = node.properties?.className;
      if (typeof classList === 'string') match = LANGUAGE_RE.exec(classList);
      else if (Array.isArray(classList)) {
        for (const one of classList) {
          if (typeof one !== 'string') continue;
          match = LANGUAGE_RE.exec(one);
          if (match) break;
        }
      }
      const written = match?.[1] ?? 'plaintext';
      if (EXCLUDE_LANGS.includes(written)) return;
      blocks.push({ code: node, written, pre, parent: ancestors.at(-2) });
    });
    if (blocks.length === 0) return;

    const want = new Set(blocks.map((b) => grammarOf(b.written)));
    want.delete('plaintext');
    await takeGrammars(want);
    const shiki = await getHighlighter();

    for (const { code, written, pre, parent } of blocks) {
      const lang = grammarOf(written);
      const label = written === 'plaintext' || known(written) ? written : 'plaintext';
      const source = toText(code, { whitespace: 'pre' }).replace(/(?:\r\n|\r|\n)$/, '');
      const meta = code.data?.meta ?? code.properties?.metastring ?? undefined;
      const rendered = shiki.codeToHast(source, {
        lang: lang as never,
        theme: THEME,
        meta: meta ? { __raw: meta } : undefined,
        transformers: [
          {
            pre(out: Element) {
              out.properties ??= {};
              // Astro 把 shiki 那个 .shiki 类名改成 .astro-code，库里存的就该是这个
              out.properties.class = String(out.properties.class ?? '').replace(/shiki/g, 'astro-code');
              out.properties.dataLanguage = label;
              out.properties.style = `${out.properties.style ?? ''}; overflow-x: auto;`;
            },
          },
        ],
      });
      const replacement = rendered.children[0];
      removePosition(replacement, true);
      parent.children[parent.children.indexOf(pre)] = replacement;
    }
  };
}

/** 这一块的标题（文本 + 源码自带的 id），按文档顺序。数的语义和原来那条 visit 一样 */
function headingsOf(tree: Element) {
  const out: { text: string; preset: string | null }[] = [];
  visit(tree, (node: Element) => {
    if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) return;
    let text = '';
    visit(node, (child: Element) => {
      if (child.type === 'text') text += child.value;
    });
    const id = node.properties?.id;
    out.push({ text, preset: typeof id === 'string' ? id : null });
  });
  return out;
}

/** 把数好的序号按文档顺序贴回标题上（走树顺序必须和 headingsOf 是同一条） */
function pasteIds(tree: Element, ids: string[]) {
  let k = 0;
  visit(tree, (node: Element) => {
    if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) return;
    node.properties ??= {};
    const id = ids[k++];
    if (id !== undefined) node.properties.id = id;
  });
}

export async function createRenderer(): Promise<MarkdownRenderer> {
  await getHighlighter();

  // 拆成两段是为了「只重量变化那一块」：
  //   typeset 解析 → … → KaTeX，还没补标题 id（贵，一块一块跑，结果能复用）
  //   finish  贴 id → rehype-raw → 序列化（只有源文或标题序号变了的那块才跑）
  // 块边界不在这儿：它在 src/lib/md-blocks.ts，写作台量边界时不必把这份排版包拉进来。
  const typeset = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartypants)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki)
    .use(rehypeKatex);
  const finish = unified().use(rehypeRaw).use(rehypeStringify, { allowDangerousHtml: true });

  async function renderDoc(markdown: string, prev?: DocState): Promise<RenderedDoc> {
    const list = splitBlocks(markdown);
    // 复用按**源文内容**找，不按块的位置：在开头插一段，后面每一块都挪了位，
    // 按位置找就是全篇重排（实测那篇 70 块的长文要 454ms）。这样找是安全的，
    // 因为标题序号本来就要整篇重数一遍，数出来和上次那块的不一样就会重排那块的收尾。
    const pool = new Map<string, DocEntry>();
    for (const e of prev?.entries ?? []) pool.set(e.source, e);

    const entries: DocEntry[] = [];
    for (const block of list) {
      const hit = pool.get(block.source);
      if (hit) {
        // 拷一份条目：同一个源文在一篇里出现两次时，两个位置的标题序号不一样，
        // 不能让后一个把前一个的 html / ids 盖掉。树是只读的（贴 id 前会 structuredClone）
        entries.push({ ...hit });
        continue;
      }
      const tree = await typeset.run(await typeset.parse(block.source));
      entries.push({ source: block.source, tree, heads: headingsOf(tree), ids: [], html: null });
    }

    // 序号必须整篇共用一个 slugger、按文档顺序数：同一篇里两个同名标题，整篇排得到
    // foo 和 foo-1，一块一个 slugger 得到两个 foo（原来每次 render() 新建一个的做法作废）
    const slugger = new Slugger();
    for (const entry of entries) {
      const ids = entry.heads.map((h) => h.preset ?? slugger.slug(h.text));
      const moved = ids.length !== entry.ids.length || ids.some((id, k) => id !== entry.ids[k]);
      if (entry.html === null || moved) {
        // 缓存的树是「补 id 之前」的样子，动副本、别动它，否则下一次复用就是脏的
        const copy = structuredClone(entry.tree);
        pasteIds(copy, ids);
        entry.html = String(finish.stringify(await finish.run(copy)));
      }
      entry.ids = ids;
    }

    const blocks: RenderedBlock[] = entries.map((e) => ({ source: e.source, html: e.html! }));
    // 整篇排的时候 rehype-stringify 在顶层节点之间留一个换行，拼的时候得一样留，
    // 否则和 Astro 比就是「这里少一个空格」的假阳性
    return { html: blocks.map((b) => b.html).join('\n'), blocks, entries };
  }

  return {
    render: async (markdown: string) => (await renderDoc(markdown)).html,
    renderDoc,
  };
}
