/**
 * 全站唯一的 Markdown 排版出口：写作页的实时预览、提交入库的那份 HTML、以及把现有
 * 文章灌进 D1 的种子脚本，跑的都是这一份代码（浏览器与 Node 两个宿主）。
 *
 * ⚠ 它复刻的是 Astro 那条 unified 管线，不是另一套风格：插件顺序、shiki 主题、KaTeX
 *   输出逐项照 Astro 抄。改排版配置就改这里，改完跑 node scripts/check-render.mjs 对照。
 * ⚠ 不能直接用 @astrojs/markdown-remark 的 createMarkdownProcessor：那个包要 node:path /
 *   node:url / node:module，导不进浏览器。
 */
import Slugger from 'github-slugger';
import { toText } from 'hast-util-to-text';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubLight from 'shiki/themes/github-light.mjs';
import langAstro from 'shiki/langs/astro.mjs';
import langBash from 'shiki/langs/bash.mjs';
import langC from 'shiki/langs/c.mjs';
import langCpp from 'shiki/langs/cpp.mjs';
import langCss from 'shiki/langs/css.mjs';
import langDiff from 'shiki/langs/diff.mjs';
import langGlsl from 'shiki/langs/glsl.mjs';
import langGo from 'shiki/langs/go.mjs';
import langHtml from 'shiki/langs/html.mjs';
import langJava from 'shiki/langs/java.mjs';
import langJavascript from 'shiki/langs/javascript.mjs';
import langJson from 'shiki/langs/json.mjs';
import langJsonc from 'shiki/langs/jsonc.mjs';
import langJsx from 'shiki/langs/jsx.mjs';
import langMarkdown from 'shiki/langs/markdown.mjs';
import langPowershell from 'shiki/langs/powershell.mjs';
import langPython from 'shiki/langs/python.mjs';
import langRust from 'shiki/langs/rust.mjs';
import langScss from 'shiki/langs/scss.mjs';
import langShellscript from 'shiki/langs/shellscript.mjs';
import langSql from 'shiki/langs/sql.mjs';
import langToml from 'shiki/langs/toml.mjs';
import langTsx from 'shiki/langs/tsx.mjs';
import langTypescript from 'shiki/langs/typescript.mjs';
import langVue from 'shiki/langs/vue.mjs';
import langWgsl from 'shiki/langs/wgsl.mjs';
import langYaml from 'shiki/langs/yaml.mjs';
import { removePosition } from 'unist-util-remove-position';
import { visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';
import { unified } from 'unified';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';

const THEME = 'github-light';

/**
 * fence 里能写的名字 → 语法。
 * ⚠ 这里不列全 shiki 的 900 个语法：用 shiki 的 createHighlighter 会把整套语法包
 *   拖进模块图，rolldown 在打包 / 依赖预扫描时反复分配失败。这个站实际用到的语法
 *   是 glsl / js / astro 这几样，其余按这张表按需加；表外的名字（包括打错的语言）
 *   按纯文本排，不报错。
 */
const LANGS: Record<string, unknown> = {
  astro: langAstro,
  bash: langBash,
  c: langC,
  cpp: langCpp,
  css: langCss,
  diff: langDiff,
  glsl: langGlsl,
  go: langGo,
  html: langHtml,
  java: langJava,
  js: langJavascript,
  javascript: langJavascript,
  json: langJson,
  jsonc: langJsonc,
  jsx: langJsx,
  md: langMarkdown,
  markdown: langMarkdown,
  powershell: langPowershell,
  py: langPython,
  python: langPython,
  rs: langRust,
  rust: langRust,
  scss: langScss,
  sh: langShellscript,
  shell: langShellscript,
  shellscript: langShellscript,
  sql: langSql,
  toml: langToml,
  ts: langTypescript,
  tsx: langTsx,
  typescript: langTypescript,
  vue: langVue,
  wgsl: langWgsl,
  yaml: langYaml,
};
/** Astro 的 shiki 跳过哪些语言（值来自 @astrojs/internal-helpers 的 defaultExcludeLanguages） */
const EXCLUDE_LANGS = ['math'];
/** ```js 会被 remark-rehype 变成 <code class="language-js">，语言从这个类名读 */
const LANGUAGE_RE = /\blanguage-(\S+)\b/;

type Element = any;

export type MarkdownRenderer = {
  render: (markdown: string) => Promise<string>;
};

let highlighter: Promise<any> | null = null;

/** shiki 建一次就留着：首建要解析主题和语法，每次按键都建一遍太贵 */
function getHighlighter(): Promise<any> {
  highlighter ??= createHighlighterCore({
    themes: [githubLight],
    langs: [...new Set(Object.values(LANGS))] as never,
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

/** 把每个 ``` 代码块换成 shiki 排好的节点，行为对齐 Astro 的 rehype-shiki */
function rehypeShiki() {
  return async (tree: Element) => {
    const blocks: { code: Element; lang: string; pre: Element; parent: Element }[] = [];
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
      const raw = match?.[1] ?? 'plaintext';
      if (EXCLUDE_LANGS.includes(raw)) return;
      blocks.push({ code: node, lang: raw, pre, parent: ancestors.at(-2) });
    });
    if (blocks.length === 0) return;

    const shiki = await getHighlighter();
    for (const { code, lang: written, pre, parent } of blocks) {
      // 名字在 LANGS 表里就用它，不在（含打错的语言）就按纯文本排
      const lang = written === 'plaintext' || LANGS[written] ? written : 'plaintext';
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
              out.properties.dataLanguage = lang;
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

/** 标题补 id，和 Astro 一样用 github-slugger。现在页面上没有锚点依赖它，留着是为了以后能加目录 */
function rehypeHeadingIds() {
  return (tree: Element) => {
    // Slugger 必须按篇新建：renderer 是复用的，挂在工厂里会让第二次起的预览
    // 接着上一次的序号发 id（world、world-1、world-2……）
    const slugger = new Slugger();
    visit(tree, (node: Element) => {
      if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) return;
      node.properties ??= {};
      if (typeof node.properties.id === 'string') return;
      let text = '';
      visit(node, (child: Element) => {
        if (child.type === 'text') text += child.value;
      });
      node.properties.id = slugger.slug(text);
    });
  };
}

export async function createRenderer(): Promise<MarkdownRenderer> {
  await getHighlighter();
  const parser = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartypants)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki)
    .use(rehypeKatex)
    .use(rehypeHeadingIds)
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true });

  return {
    render: async (markdown: string) => String((await parser.process(markdown)).value),
  };
}
