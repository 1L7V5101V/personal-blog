/**
 * 鼠标光晕：指针处一团红光（层在 Base.astro，样式在 global.css 的 .mouselight）。
 * 全站生效；位置走补间（光跟着指针跑但有惯性尾巴，同卡面那层表面光的手感），
 * 每帧只改 transform，且不自己起 rAF —— 回调挂进 Base 的统一 __fx 循环。
 */

const el = document.querySelector<HTMLElement>('.mouselight');
const hoverable = matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;
const narrow = matchMedia('(max-width: 768px)').matches;

if (el && hoverable && !narrow) {
  const EASE = 0.16;   // 每帧追近 16%：τ ≈ 100ms（和阅读导引光球同一类补间手感）

  let tx = 0, ty = 0;      // 指针实际位置
  let x = 0, y = 0;        // 光当前位置
  let lit = false;
  let written = '';        // 去重：静止就一帧都不写

  const paint = () => {
    const tf = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    if (tf !== written) { written = tf; el.style.transform = tf; }
  };

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX;
    ty = e.clientY;
    // 首次亮起（含从窗口外进来）不补间：直接从指针处亮起来，别从别处飞过去
    if (!lit) {
      lit = true;
      x = tx; y = ty;
      paint();
      el.classList.add('is-on');
    }
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    lit = false;
    el.classList.remove('is-on');
  });

  paint();
  ((window as any).__fx ||= []).push(() => {
    const dx = tx - x, dy = ty - y;
    if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) { x = tx; y = ty; paint(); return; }
    x += dx * EASE;
    y += dy * EASE;
    paint();
  });
}
