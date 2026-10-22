/* ============================================================
   写作台的纸面：一张纸。光标停在哪一块，那一块就露出 Markdown 源文；
   离开那一条，立刻就地换成排好的样子 —— 没有「下面写、上面看」那两张面。

   文档模型自始至终是一个 Markdown 字符串。块边界问 src/lib/render.ts 的 blocksOf()
   要（和排版内部切块用的是同一条规则 —— 两处不一致的话「这一块的源文」和
   「这一块排出来的样子」就会对不上号）。排好的东西也是同一份：写作台和文章页
   调的是同一个 renderDoc()。

   ⚠ 排好的块**直接挂在 .prose 底下**，不套 wrapper：阅读导引扫的是 paper 的直接子元素，
     中间垫一层，标题就不是直接子元素了，长刻度和红球全都数不到。
   ⚠ 当前这一块的 textarea 外面**要**包一层 .desk-src：台车的镜像挂在同一个爹底下，
     才和 textarea 的内容盒对齐（它量的是插入点的视口 x，爹偏一点台车就歪一点）。
   ⚠ 输入法合成期间（composing）绝不动 textarea 的值、也不重建纸面：往正在拼字的框里
     写 value 会把没上屏的那截直接吞掉。合成期间来的重排请求攒到 compositionend 再补。
   ⚠ 撤销自己接管：那块 textarea 在块与块之间搬家，浏览器的原生撤销会把「上一个块」
     的文本还回来。所以 Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y 一律拦下来走这份整篇快照。
   ============================================================ */

import { splitBlocks } from '../lib/md-blocks';
import type { DocState, MarkdownRenderer } from '../lib/render';

const HISTORY_MAX = 200;
/** 两次改动隔到这么久就算「另一笔」，撤销在这儿断一刀 */
const BURST_MS = 600;
/** 打字时重排纸面的等待：实测那篇 70 块的长文整篇重量一次约 300ms，跟不住手速 */
const REBUILD_MS = 160;

type Opt = {
  /** .prose.paper，块从大标题之后往下排 */
  paper: HTMLElement;
  /** 大标题那个 h1（正文块一律排在它之后） */
  after: HTMLElement;
  reduced: boolean;
  /** 现在哪一副面孔：true = 整张纸等宽打字机字（源文不排），false = 排好的正文 */
  typed: () => boolean;
  /** 排版引擎异步拉进来（那 768KB 的 chunk 只在排好的那副面孔下才需要） */
  engine: () => Promise<MarkdownRenderer>;
  /** 内容变了：草稿落盘、保存取值都看这里 */
  onChange: (text: string) => void;
  /** 纸面重排完，阅读导引要重量一遍刻度 */
  onRescan: () => void;
};

export type DeskPaper = {
  /** 整篇源文（含手上这一块正在编辑的） */
  readonly text: string;
  setText: (md: string) => void;
  /** 换面孔：纸上的块要从「排好的节点」换成「等宽源文行」，反过来也一样 */
  setFace: () => void;
  /** 机器那一层要绑的就是这块 textarea（它跟着光标在纸面里搬家） */
  readonly inputEl: HTMLTextAreaElement;
  /** 轨道要对准正文那一栏，量给页面用 */
  measure: () => { left: number; width: number } | null;
  destroy: () => void;
};

/** 空纸那句话要说清现在这副面孔是什么，所以跟着面孔换 */
const HINT = {
  typed: '正文直接写。这一张纸是打字机字 —— 顶栏那颗「打字机字」按下去，就换成读者看到的那副排版。',
  set: '正文直接写。表格、代码块、$E=mc^2$ 这类公式都按文章页那套排版 —— 光标离开这一条，它就是排好的样子。',
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** textarea 不会自己长：源文一多就得把它撑到内容高度，否则光标跑到看不见的地方。
    这是编辑器，一次按键一次强制重排免不了（阅读导引那些每帧循环里才禁这种写法） */
function grow(ta: HTMLTextAreaElement) {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight}px`;
}

/** 量字符宽度用的画布（字体串变了就换一个上下文） */
let measureCache: { font: string; ctx: CanvasRenderingContext2D | null } = { font: '', ctx: null };
function measureCtx(font: string): CanvasRenderingContext2D | null {
  if (measureCache.font === font) return measureCache.ctx;
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx) ctx.font = font;
  measureCache = { font, ctx };
  return ctx;
}

export function startDeskPaper(o: Opt): DeskPaper {
  const wrap = document.createElement('div');
  wrap.className = 'desk-src';
  const ta = document.createElement('textarea');
  ta.className = 'desk-src__ta';
  ta.spellcheck = false;
  ta.setAttribute('data-lenis-prevent', '');
  ta.setAttribute('aria-label', '正文（Markdown 源文）');
  ta.placeholder = HINT.typed;
  wrap.append(ta);

  let doc = '';
  let state: DocState | null = null;
  /** 每一块的源文区间，和 state.entries 一一对齐 */
  let ranges: { start: number; end: number }[] = [];
  /** 块源文 → 排好的节点：源文一字没改就复用同一批节点（KaTeX 那种大树重建很贵）。
      每一轮把不在场的收掉，免得改一篇长文攒一堆游离 DOM 不放手 */
  const runs = new Map<string, Node[]>();
  /** 打字机那副面孔的同一份缓存：源文 → 一行 `<pre class="desk-line">` */
  const typeRuns = new Map<string, Node[]>();
  /** 手上这一块在整篇里的区间（textarea 的内容就是这一段） */
  let aStart = 0;
  let aEnd = 0;
  let composing = false;
  let pending = false;
  let busy = false;
  let again = false;

  // ---- 撤销：整篇快照，不分块 ----
  type Snap = { doc: string; caret: number };
  const undo: Snap[] = [];
  const redo: Snap[] = [];
  let lastPush = 0;
  let lastLen = 0;

  function pushHistory() {
    const now = performance.now();
    const burst = now - lastPush < BURST_MS && Math.abs(doc.length - lastLen) < 40;
    lastPush = now;
    lastLen = doc.length;
    if (burst && undo.length) return;
    undo.push({ doc, caret: aStart + (ta.selectionStart ?? 0) });
    if (undo.length > HISTORY_MAX) undo.shift();
    redo.length = 0;
  }

  function step(from: Snap[], to: Snap[]) {
    const snap = from.pop();
    if (!snap) return;
    to.push({ doc, caret: aStart + (ta.selectionStart ?? 0) });
    doc = snap.doc;
    void rebuild(snap.caret);
  }

  /** 整篇第 offset 个字符属于第几块 */
  function blockAt(offset: number) {
    for (let i = 0; i < ranges.length; i++) if (offset < ranges[i].end) return i;
    return Math.max(0, ranges.length - 1);
  }

  async function rebuild(caret?: number): Promise<void> {
    if (composing) {
      pending = true;
      return;
    }
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    try {
      const docAt = doc;
      const typed = o.typed();
      ta.placeholder = typed ? HINT.typed : HINT.set;
      const list = splitBlocks(docAt);
      ranges = list.map((b) => ({ start: b.start, end: b.end }));
      const at = clamp(caret ?? aStart + (ta.selectionStart ?? 0), 0, docAt.length);
      const k = blockAt(at);
      aStart = list[k].start;
      aEnd = list[k].end;

      // 手上这一块的源文。值没变就别写（写一下光标就跳、输入法就断），变了才落
      const src = docAt.slice(aStart, aEnd);
      const sel0 = clamp(at - aStart, 0, src.length);
      // 块尾那些空行是结构不是内容：**跳进**这一块时（点击、跨块、撤销）光标夹在空行里
      // 就按到正文末尾，不然会落在看不见的位置。⚠ 但打字这一路不能钳 ——
      // 段尾按回车时新敲的那几个换行正是「块尾空行」，钳了就等于把光标拽回正文末尾，
      // 接着敲的字会插到回车符前面（实测踩过）。
      const sel = caret === undefined ? sel0 : Math.min(sel0, src.trimEnd().length);
      if (ta.value !== src) ta.value = src;
      if (ta.selectionStart !== sel || ta.selectionEnd !== sel) ta.setSelectionRange(sel, sel);
      grow(ta);

      // 打字机那副面孔根本不排版：整张纸就是源文，那 768KB 的包也就不必拉进来
      if (!typed) {
        const eng = await o.engine().catch(() => null);
        if (!eng) {
          busy = false;
          return;
        }
        state = await eng.renderDoc(docAt, state ?? undefined);
      }
      // ⚠ 等排版这段时间里内容可能又变了（手还在敲、粘贴分几段进来、输入法上屏）。
      //   这时候绝不能拿这一轮的旧快照去覆写纸面 —— 那会把刚敲进去的字盖掉，
      //   下一轮再把「被盖掉之前那一份」当成新增拼回去，实测同一段字被拼了五遍存进库。
      //   整轮作废、重跑一次就好（again 那条），反正贵的 shiki / KaTeX 在 renderDoc 里已经复用了。
      if (doc !== docAt) {
        again = true;
        return;
      }

      // 想要的孩子顺序：当前这一块用 wrapper，其余按面孔用「排好的节点」或「一行等宽源文」。
      // 缓存按源文（排好的那份还带上标题序号）：一字没改就复用同一批节点，KaTeX 那种大树重建很贵。
      const cache = typed ? typeRuns : runs;
      const want: Node[] = [];
      const live = new Set<string>();
      for (let i = 0; i < list.length; i++) {
        if (i === k) {
          want.push(wrap);
          continue;
        }
        const source = list[i].source;
        if (!source.trim()) continue;
        const entry = state?.entries[i];
        const key = typed ? source : `${source}\0${entry?.ids.join('\u0001') ?? ''}`;
        live.add(key);
        let nodes = cache.get(key);
        if (!nodes) {
          if (typed) {
            const pre = document.createElement('pre');
            pre.className = 'desk-line';
            pre.textContent = source;
            nodes = [pre];
          } else {
            if (!entry?.html?.trim()) {
              live.delete(key);
              continue;
            }
            const tmp = document.createElement('div');
            tmp.innerHTML = entry.html;
            nodes = [...tmp.childNodes];
            if (!nodes.length) {
              live.delete(key);
              continue;
            }
          }
          cache.set(key, nodes);
        }
        // 块号按**现在的位置**改写：前面插了一段，同一批节点的号就跟着挪
        for (const n of nodes) if (n.nodeType === 1) (n as HTMLElement).dataset.mdBlock = String(i);
        want.push(...nodes);
      }

      // 先摘掉不该在场的，再把不在页面里的缓存一并销掉（换面孔时，另一副的节点就是这么退场的）
      for (const child of [...o.paper.children]) {
        if (child !== o.after && !want.includes(child)) child.remove();
      }
      for (const [key, nodes] of [...runs, ...typeRuns]) {
        if (!live.has(key) || !nodes[0].isConnected) {
          runs.delete(key);
          typeRuns.delete(key);
        }
      }

      // 再按 want 的顺序理顺：只把错位的挪到前面来。在位的绝不重插 ——
      // 重插会把光标和输入法一起弄丢
      let ref = o.after.nextSibling;
      for (const node of want) {
        if (ref === node) {
          ref = ref.nextSibling;
          continue;
        }
        o.paper.insertBefore(node, ref);
      }

      o.onRescan();
      o.onChange(doc);
      if (!o.reduced) o.paper.animate([{ opacity: 0.92 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
    } finally {
      busy = false;
      if (again) {
        again = false;
        await rebuild();
      }
    }
  }

  /** 把当前这一块收回整篇，然后重排。
      typing 那一路要等一手（每敲一个字就重排整篇，长文跟不上手速）；
      跨块、点击、撤销那几路是「用户明确要求挪位置」，立刻排 */
  let hold = 0;
  function commit(caret?: number, typing = false) {
    const text = ta.value;
    if (doc.slice(aStart, aEnd) !== text) {
      pushHistory();
      doc = doc.slice(0, aStart) + text + doc.slice(aEnd);
      // ⚠ 收进来之后立刻把区间对齐到手上的内容。中文输入法、粘贴、CDP 的 insertText
      //   都会连着发好几个 input，而块边界要等重排才重算 —— 不对齐的话第二次同样的值
      //   会被当成「区间里是空的」再拼一遍上去（实测同一段字被拼成四份存进库）。
      //   对齐之后，同样的值是一次空操作，改了值就是改那一段。
      aEnd = aStart + text.length;
    }
    if (!typing) {
      clearTimeout(hold);
      return rebuild(caret);
    }
    clearTimeout(hold);
    return new Promise<void>((done) => {
      hold = window.setTimeout(() => void rebuild(caret).then(done), REBUILD_MS);
    });
  }

  // ---- 点击定位：点进一块已经排好的正文 ----
  /** 那一块从头开始排，排完之后再用点击点的 (x, y) 在这块源文里反推行列 */
  async function clickInto(block: number, x: number, y: number) {
    await commit(ranges[block]?.start ?? 0);
    const box = ta.getBoundingClientRect();
    if (!box.height) return;
    const cs = getComputedStyle(ta);
    const lineH = Number.parseFloat(cs.lineHeight) || 22;
    const padT = Number.parseFloat(cs.paddingTop) || 0;
    const padL = Number.parseFloat(cs.paddingLeft) || 0;
    const ctx = measureCtx(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
    if (!ctx) return;

    const visual = Math.floor((y - box.top - padT + ta.scrollTop) / lineH);
    if (visual < 0) {
      ta.setSelectionRange(0, 0);
      return;
    }
    // 一条源文行折行会占好几个行框，所以要一行一行累计行框数才知道点的是哪一行；
    // 行内再按**每个字符自己的宽度**累计 —— 拿西文字符宽去量中文会差出半个到一个字
    const rowW = Math.max(20, box.width - padL * 2);
    const lines = ta.value.split('\n');
    let rowsSeen = 0;
    let offset = 0;
    for (const line of lines) {
      const rows = wrappedRows(line, rowW, ctx);
      if (rowsSeen + rows > visual) {
        const at = offset + colInLine(line, rowW, visual - rowsSeen, x - box.left - padL, ctx);
        ta.setSelectionRange(at, at);
        return;
      }
      rowsSeen += rows;
      offset += line.length + 1;
    }
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  /** 这一行按可用宽折成几个行框 */
  function wrappedRows(line: string, rowW: number, ctx: CanvasRenderingContext2D): number {
    let rows = 1;
    let acc = 0;
    for (const ch of line) {
      const w = ctx.measureText(ch).width;
      if (acc + w > rowW) {
        rows++;
        acc = w;
      } else acc += w;
    }
    return rows;
  }

  /** 这一行的第 wantRow 个行框里，横向 px 落在第几个字符上 */
  function colInLine(
    line: string,
    rowW: number,
    wantRow: number,
    px: number,
    ctx: CanvasRenderingContext2D,
  ): number {
    let row = 0;
    let acc = 0;
    let i = 0;
    for (const ch of line) {
      const w = ctx.measureText(ch).width;
      if (acc + w > rowW) {
        row++;
        acc = 0;
        if (row > wantRow) break;
      }
      if (row === wantRow && acc + w > px) return i;
      acc += w;
      i++;
    }
    return wantRow === row ? line.length : i;
  }

  // ---- 事件 ----
  // 敲字这一路先立刻把框撑高（光标得看得见），纸面的重排等一手再排
  ta.addEventListener('input', () => {
    grow(ta);
    void commit(undefined, true);
  });
  ta.addEventListener('compositionstart', () => {
    composing = true;
  });
  ta.addEventListener('compositionend', () => {
    composing = false;
    // 上屏这一下不再等：合成期间的重排请求也在这一次一起补掉
    void commit(undefined, pending ? false : true);
    pending = false;
  });

  let lastKey = '';
  ta.addEventListener('keydown', (e) => {
    lastKey = e.key;
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      step(e.shiftKey ? redo : undo, e.shiftKey ? undo : redo);
      return;
    }
    if (meta && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      step(redo, undo);
    }
  });
  // 方向键按到块的外面，就把光标交给邻块（点别的块归下面的 mousedown 管）。
  // ⚠ selectionchange 不冒泡，这类监听必须挂在 textarea 自己身上
  ta.addEventListener('keyup', () => {
    const s = ta.selectionStart ?? 0;
    if (lastKey === 'ArrowLeft' && s === 0 && aStart > 0) void commit(aStart - 1);
    else if (lastKey === 'ArrowRight' && s >= ta.value.trimEnd().length && aEnd < doc.length) void commit(aEnd);
  });

  o.paper.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.desk-src')) return;             // 就在当前这一块里，浏览器自己管光标
    const owned = target.closest<HTMLElement>('[data-md-block]');
    if (!owned) return;
    const block = Number(owned.dataset.mdBlock);
    if (!ranges[block]) return;
    e.preventDefault();                                   // 别让浏览器先把已有选区清了
    ta.focus();
    void clickInto(block, e.clientX, e.clientY);
  });

  const onResize = () => void rebuild();
  addEventListener('resize', onResize);

  return {
    get text() {
      return doc.slice(0, aStart) + ta.value + doc.slice(aEnd);
    },
    setText(md: string) {
      doc = md;
      undo.length = 0;
      redo.length = 0;
      runs.clear();
      typeRuns.clear();
      state = null;
      ranges = [];
      void rebuild(0);
    },
    setFace() {
      // 面孔换了 = 纸上每一块都要换成另一种节点；缓存留着，切回去还是复用的
      void rebuild();
    },
    inputEl: ta,
    measure: () => {
      if (!wrap.isConnected) return null;
      const cs = getComputedStyle(ta);
      const box = ta.getBoundingClientRect();
      return { left: box.left + (Number.parseFloat(cs.paddingLeft) || 0), width: ta.clientWidth };
    },
    destroy() {
      removeEventListener('resize', onResize);
      wrap.remove();
    },
  };
}
