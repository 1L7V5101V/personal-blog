/* ============================================================
   压印：刚敲下去那个字重一档、墨往四周洇一点，420ms 落回普通印刷。
   ------------------------------------------------------------
   抄的是 Typewriter-Nocturne 的 ink-layer.ts。它盖在 xterm.js 画好的字上，
   我们盖在 textarea 的字上 —— 干的是同一件事：字本身早就在了，这一层只补
   「刚被打上来」那一下，所以它不延迟任何东西，也不改文档。

   位置怎么来：镜像元素里把「光标前那一个字符」用一个 span 圈住，量它的方框；
   再在它后面挂一个零高度的 inline-block，它的下边缘就落在基线上 —— 于是
   fillText 能画在同一个字、同一条基线上，看不出是两层。
   ⚠ 镜像必须和 textarea 同一个爹（.desk-src 是 relative），否则 x 要再加一次偏移。
   ⚠ 镜像里要装「光标之前的全部文本」，不能只装当前这一行：只装一行的话，镜像永远从
     第一行起排，光标走到第二行往后，量出来的基线就一直是块首那一行（用户 2026-10 报的
     「换行之后压印还保持在上一行」）。
   ⚠ 减动效下整层不建：这一下是「动」的，不是帮助理解的反馈（见 AGENTS.md 坑 6）。
   ============================================================ */

import { copyTypeStyles } from './desk-machine';

const SETTLE_MS = 420;
/** 压印的强度：0 = 关掉 */
const IMPRESSION = 1;

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

type Strike = {
  ch: string;
  x: number;
  base: number;
  size: string;
  family: string;
  style: string;
  weight: string;
  at: number;
  /** 敲下这一笔时 textarea 在文档里的位置（已扣掉 tuck）—— 块被重排搬走了就对不上 */
  anchor: number;
  left: number;
  width: number;
};

export function createInk(input: HTMLTextAreaElement, reduced: boolean) {
  if (reduced) return { strike() {}, shift() {}, recheck() {}, destroy() {} };

  const canvas = document.createElement('canvas');
  canvas.className = 'deskink';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d')!;

  // 量字框用的镜像：和台车那一个同样的抄法，装「光标之前的全部文本 + 这个字 + 本行剩下的」
  const mirror = document.createElement('div');
  mirror.className = 'deskmirror';
  mirror.setAttribute('aria-hidden', 'true');
  const line = document.createElement('div');
  const before = document.createElement('span');
  const wrap = document.createElement('span');
  const ch = document.createElement('span');
  const baseline = document.createElement('span');
  baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  wrap.append(ch, baseline);
  const after = document.createElement('span');
  line.append(before, wrap, after);
  mirror.append(line);

  const strikes: Strike[] = [];
  let mounted = false;
  let drawn = false;
  let color = '#000';

  function mount() {
    if (mounted && mirror.parentElement === input.parentElement) return;
    document.body.append(canvas);
    input.parentElement?.append(mirror);
    mounted = true;
    resize();
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(innerWidth * dpr));
    canvas.height = Math.max(1, Math.round(innerHeight * dpr));
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawn = false;
  }

  /** 卷纸把稿纸往下推了多少（--desk-tuck），读出来只用来算「位置有没有被搬动」 */
  function tuck(): number {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--desk-tuck');
    return Number.parseFloat(v) || 0;
  }

  /** 记下一笔：量刚敲那个字的方框和基线 */
  function strike() {
    const caret = input.selectionStart ?? 0;
    const text = input.value.slice(0, caret);
    const start = text.lastIndexOf('\n') + 1;
    const lineText = text.slice(start);
    if (!lineText) return;                       // 光标在行首：这一行还没有字可压
    mount();
    const cs = getComputedStyle(input);
    copyTypeStyles(cs, mirror);
    mirror.style.width = `${input.clientWidth}px`;
    color = cs.color;
    // 前面的行也要在镜像里：镜像从第一行起排，字才会落在它真正那一行上
    before.textContent = text.slice(0, -1);
    ch.textContent = lineText.at(-1)!;
    // 后面那截要一起给：镜像要按同一行的完整文本来折行，位置才对得上
    const rest = input.value.slice(caret);
    const nl = rest.indexOf('\n');
    after.textContent = nl < 0 ? rest : rest.slice(0, nl);
    const box = ch.getBoundingClientRect();
    if (!box.width) return;
    const at = input.getBoundingClientRect();
    strikes.push({
      ch: lineText.at(-1)!,
      x: box.left,
      // 存文档坐标：一笔要落 420ms，这期间滚了轮子它得跟着字走，不能钉在屏幕上
      base: baseline.getBoundingClientRect().bottom + scrollY,
      size: cs.fontSize,
      family: cs.fontFamily,
      style: cs.fontStyle,
      weight: cs.fontWeight,
      at: performance.now(),
      // 滚动和 tuck 都不改这个数（两者在 top 与 scrollY / padding 之间互相抵消），
      // 只有块被重排搬走它才变 —— 拿它判「这一笔还作不作数」
      anchor: at.top + scrollY - tuck(),
      left: at.left,
      width: at.width,
    });
    if (strikes.length > 48) strikes.shift();
  }

  /** 稿纸往下推或收回来 dy：落下去那一笔存的是文档坐标，纸挪多少它就得跟着挪多少 */
  function shift(dy: number) {
    for (const s of strikes) s.base += dy;
  }

  /**
   * 重排之后量一眼：正在编辑那一块被搬到别处了吗？搬了就作废已经落下去那几笔。
   * 块切开（回车另起一段 / 标题换行）时 textarea 会整个挪位，而 shift() 只跟 tuck 走，
   * 不作废的话那些墨会留在上一行继续淡出（用户 2026-10 报的「换行之后压印还保持在上一行」）。
   * 不重新锚定是因为那一笔真正该跟的字已经排回正文里了，和 textarea 走的不是同一段位移。
   */
  function recheck() {
    if (!strikes.length) return;
    const at = input.getBoundingClientRect();
    const s = strikes[0];
    if (
      Math.abs(at.top + scrollY - tuck() - s.anchor) > 0.6 ||
      Math.abs(at.left - s.left) > 0.6 ||
      Math.abs(at.width - s.width) > 0.6
    ) {
      strikes.length = 0;
    }
  }

  /** 一帧：只画还在回落的那几个字，一笔都没有就把整层擦掉 */
  function frame(now: number) {
    for (let i = strikes.length - 1; i >= 0; i--) if (now - strikes[i].at >= SETTLE_MS) strikes.splice(i, 1);
    if (!strikes.length) {
      if (drawn) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawn = false;
      }
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawn = true;
    ctx.textBaseline = 'alphabetic';
    const y0 = scrollY;
    for (const s of strikes) {
      const k = (1 - smooth((now - s.at) / SETTLE_MS)) * IMPRESSION;
      const base = s.base - y0;
      // 墨洇：同一颗字，外面那圈带模糊的先落，里面那颗换成一档更重的字重
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 1.5 + 3 * k;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 * k;
      ctx.font = `${s.style} ${s.weight} ${s.size} ${s.family}`;
      ctx.fillText(s.ch, s.x, base);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = color;
      ctx.font = `${s.style} ${Math.min(900, Number(s.weight || 400) + 300)} ${s.size} ${s.family}`;
      ctx.fillText(s.ch, s.x, base);
      ctx.restore();
    }
  }

  // ⚠ 统一 rAF 调回调时不传参（AGENTS.md 坑 18），所以包一层自己取时间
  const cb = () => frame(performance.now());
  const fx: ((...a: any[]) => void)[] = ((window as any).__fx ??= []);
  fx.push(cb);
  addEventListener('resize', resize);

  return {
    strike,
    shift,
    recheck,
    destroy() {
      const i = fx.indexOf(cb);
      if (i >= 0) fx.splice(i, 1);
      removeEventListener('resize', resize);
      canvas.remove();
      mirror.remove();
      mounted = false;
    },
  };
}
