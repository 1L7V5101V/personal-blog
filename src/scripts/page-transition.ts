/**
 * 点开卡片 / 返回的整页过渡（vanilla，跟随站点"手写动效"约定）。
 *
 * 正向：点卡片 → 纸片（卡片的"平卡"快照）从卡片版位放大到满屏 → 跳转 →
 *       目标页满屏纯白淡出、文章内容升起（pt-rise）。
 * 反向：回到来源页（浏览器后退 / 文章页返回链接）→ 恢复点击时的滚动位置 →
 *       满屏白纸缩回卡片版位、页面交还。首页 fx 收到 pt-back 信号后不重播开场。
 *
 * 全部用 WAAPI/CSS 一次性动画，不碰 __fx 的 rAF 循环；
 * prefers-reduced-motion 与移动端（≤768px）直接放行原生跳转，零动画。
 */

const KEY = 'pt';

type Rec = {
  url: string; // 目标路径（去尾斜杠）
  src: string; // 来源路径
  pt: string; // 卡片 data-pt 值
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // 卡片圆角
  sy: number; // 点击时来源页的纵向滚动位置
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 768px)').matches;
// iOS 感：打开 = 快起、缓停（expo-out），冲过满屏 4% 再回落定住；关闭 = 加速撞进图标（ease-in）
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.36, 0, 0.66, 0.42)';

let transitioning = false; // 动画期间再点卡片不响应（防双击双跳）
let wheelLock: ((e: Event) => void) | null = null;

const strip = (s: string) => {
  const c = s.split(/[?#]/)[0];
  return c === '/' ? '/' : c.replace(/\/+$/, '');
};

function read(): Rec | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Rec) : null;
  } catch {
    return null;
  }
}
function write(r: Rec) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
}
function clear() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

function scrollLock(on: boolean) {
  const L = (window as any).__lenis;
  if (L) {
    on ? L.stop() : L.start();
  }
  if (on && !wheelLock) {
    wheelLock = (e: Event) => e.preventDefault();
    addEventListener('wheel', wheelLock, { passive: false, capture: true });
    addEventListener('touchmove', wheelLock, { passive: false, capture: true });
  } else if (!on && wheelLock) {
    removeEventListener('wheel', wheelLock, { capture: true } as any);
    removeEventListener('touchmove', wheelLock, { capture: true } as any);
    wheelLock = null;
  }
}

function setScroll(y: number) {
  const L = (window as any).__lenis;
  if (L) L.scrollTo(y, { immediate: true });
  else window.scrollTo(0, y);
}

function coverScale(w: number, h: number) {
  // 精确盖满即可（留 0.15% 防设备像素比擦边发丝）；overshoot 由动画关键帧负责、会回落回 1
  return Math.max(innerWidth / w, innerHeight / h) * 1.0015;
}

function cardRadius(anchor: Element) {
  // .hcard 本体没有圆角（圆角在 .imgbox 上），取真正可见盒的圆角
  const box = anchor.querySelector('.imgbox') || anchor;
  const r = parseFloat(getComputedStyle(box as HTMLElement).borderRadius);
  return Number.isFinite(r) && r > 0 ? r : 26;
}

/** 拍一张"平卡"快照：剥掉弯曲切片 / 视差画布 / 内联 transform，克隆才和真卡对得上 */
function flatClone(anchor: Element): HTMLElement {
  const c = anchor.cloneNode(true) as HTMLElement;
  c.classList.remove('is-bent', 'is-hovering', 'is-focused');
  c.removeAttribute('id');
  c.removeAttribute('href');
  c.querySelectorAll('.bend-seg').forEach((s) => s.remove());
  c.querySelector('.fdpt')?.remove();
  c.style.transition = 'none';
  c.style.animation = 'none';
  c.style.transform = '';
  c.style.clipPath = '';
  c.style.margin = '0';
  c.style.position = 'absolute';
  c.style.inset = '0';
  c.style.width = '100%';
  c.style.height = '100%';
  return c;
}

/** 清掉陈旧的遮罩：bfcache 恢复时，正向跳转留下的满屏白纸还冻在旧 DOM 里（fill:both
 *  停在终帧），不删掉返回动画一结束，页面就被它永久盖住 */
function purgeCurtains() {
  document.querySelectorAll('.pt-curtain').forEach((c) => c.remove());
}

function makeCurtain(): { cv: HTMLDivElement; paper: HTMLDivElement } {
  const cv = document.createElement('div');
  cv.className = 'pt-curtain';
  cv.setAttribute('aria-hidden', 'true');
  const paper = document.createElement('div');
  paper.className = 'pt-paper';
  paper.style.transformOrigin = '0 0';
  cv.appendChild(paper);
  document.body.appendChild(cv);
  return { cv, paper };
}

/** 海报卡：把 --pan 从原槽位带进纸片，克隆里的大字位置才和真卡一致 */
function carryPan(anchor: Element, paper: HTMLDivElement) {
  const slot = anchor.closest('.pslot');
  if (!slot) return;
  const pan = getComputedStyle(slot).getPropertyValue('--pan');
  if (pan) paper.style.setProperty('--pan', pan);
}

/** 打开方向：纸片从卡片放大到满屏（iOS 式"点开"） */
function openFrom(anchor: Element, rec: Rec) {
  const { cv, paper } = makeCurtain();
  // 列表行（细条）用纯白纸片就够了——字放大成糊片不值得
  if (!anchor.classList.contains('row')) {
    paper.appendChild(flatClone(anchor));
    carryPan(anchor, paper);
  }
  paper.style.left = `${rec.x}px`;
  paper.style.top = `${rec.y}px`;
  paper.style.width = `${rec.w}px`;
  paper.style.height = `${rec.h}px`;
  paper.style.borderRadius = `${rec.r}px`;
  // 把来源卡的 hover 缩放压掉：纸片是按"未悬浮"尺寸拍的
  anchor.closest('.slot')?.classList.add('pt-opening');

  const s = coverScale(rec.w, rec.h);
  const tx = innerWidth / 2 - rec.x - (s * rec.w) / 2;
  const ty = innerHeight / 2 - rec.y - (s * rec.h) / 2;
  // iOS 式单表面缩放：快起 → 冲过满屏 4%（边缘此刻已在视口外）→ 回落精确盖住视口
  // 段间 easing 取前一个关键帧的：0→0.86 用 expo-out（快起缓停），0.86→1 用快收
  const big = s * 1.04;
  const bx = innerWidth / 2 - rec.x - (big * rec.w) / 2;
  const by = innerHeight / 2 - rec.y - (big * rec.h) / 2;
  paper.animate(
    [
      { transform: 'translate(0px, 0px) scale(1)', borderRadius: `${rec.r}px`, offset: 0, easing: EASE },
      { transform: `translate(${bx.toFixed(2)}px, ${by.toFixed(2)}px) scale(${big.toFixed(4)})`, borderRadius: '0px', offset: 0.86, easing: EASE_IN },
      { transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`, borderRadius: '0px', offset: 1 },
    ],
    { duration: 440, fill: 'both' }
  ).finished.catch(() => {});
}

/** 目标页：满屏纯白淡出，露出内容（文章页用 pt-rise 升起，列表页靠自身入场动画） */
function arrive() {
  purgeCurtains();
  const { cv, paper } = makeCurtain();
  paper.style.left = '0';
  paper.style.top = '0';
  paper.style.width = '100%';
  paper.style.height = '100%';
  paper.style.borderRadius = '0';
  paper
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
    .finished.then(() => cv.remove())
    .catch(() => {});
}

/** 返回方向：满屏白纸缩回卡片版位，再淡出交还页面。release 由 backTo 传入，
    动画结束/中断时解锁（finally 保证），保底计时器兜底。 */
function shrinkInto(rec: Rec, release: () => void) {
  const el = document.querySelector<HTMLElement>(`[data-pt="${rec.pt}"]`);
  let x = rec.x,
    y = rec.y,
    w = rec.w,
    h = rec.h,
    r = rec.r;
  let anchor: Element | null = el;
  if (el) {
    // 用渲染好的实时版位（首页轨道按恢复的滚动位置摆好后，这就是卡片此刻的像素位置）
    const live = el.getBoundingClientRect();
    if (live.width && live.height) {
      x = live.left;
      y = live.top;
      w = live.width;
      h = live.height;
    }
    r = cardRadius(el);
  }

  const { cv, paper } = makeCurtain();
  if (anchor && !anchor.classList.contains('row')) {
    paper.appendChild(flatClone(anchor));
    carryPan(anchor, paper);
  }
  paper.style.left = `${x}px`;
  paper.style.top = `${y}px`;
  paper.style.width = `${w}px`;
  paper.style.height = `${h}px`;
  paper.style.borderRadius = `${r}px`;

  const s = coverScale(w, h);
  const tx = innerWidth / 2 - x - (s * w) / 2;
  const ty = innerHeight / 2 - y - (s * h) / 2;
  const full = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
  // 首帧就落在满屏态：避免白纸先从卡片大小"跳"到满屏那一帧露馅
  paper.style.transform = full;
  paper.style.borderRadius = '0px';
  // iOS 式关闭：加速撞进卡片（ease-in）、圆角回来，落定原位后只留 90ms 极短淡出（掩护阴影闪现）
  const anim = paper.animate(
    [
      { transform: full, borderRadius: '0px', offset: 0, easing: EASE_IN },
      { transform: 'translate(0px, 0px) scale(1)', borderRadius: `${r}px`, offset: 1 },
    ],
    { duration: 340, fill: 'forwards' }
  );
  anim.finished
    .then(() => paper.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: 'ease-out', fill: 'forwards' }).finished)
    .then(() => cv.remove())
    .catch(() => cv.remove())
    .finally(() => release());
}

function backTo(rec: Rec) {
  purgeCurtains(); // bfcache 恢复：先摘掉正向动画留下的陈旧满屏纸
  // 首页 fx 别再重播开场（它会抢滚动）：模块先跑、fx 后读，双保险：属性 + 事件
  (window as any).__pt = { skipIntro: true };
  window.dispatchEvent(new Event('pt-back'));
  scrollLock(true);
  setScroll(rec.sy);
  // ⚠ 保底解锁：下面的释放链路依赖 rAF（settle 轮询）和 WAAPI finished，
  // 而窗口被遮挡/隐藏时这两者都会暂停 —— 锁一旦卡住，Lenis 停转 +
  // 滚轮全局 preventDefault，正文就永远滚不动。2.5s 后无条件放行
  //（正常路径早就走完了，提前解锁由 finally 幂等覆盖）。
  const bail = window.setTimeout(() => scrollLock(false), 2500);
  const release = () => {
    clearTimeout(bail);
    scrollLock(false);
  };
  // 等滚动真正停住再量卡片实时版位（Lenis immediate 也要一两帧才落定；白纸全程盖着）
  let n = 0;
  const settle = (lastY = scrollY) => {
    if (n >= 8 || Math.abs(scrollY - lastY) < 0.5) {
      shrinkInto(rec, release);
      return;
    }
    n++;
    requestAnimationFrame(() => settle(scrollY));
  };
  requestAnimationFrame(() => settle());
}

function boot() {
  const cur = strip(location.pathname);
  const rec = read();
  if (!rec) return;
  if (rec.url === cur) {
    // 到达目标页（从卡片点开）
    document.documentElement.classList.add('pt-arrive');
    arrive();
    return;
  }
  if (rec.src === cur) {
    // 回到来源页：后退 / 返回链接都走这里
    clear();
    backTo(rec);
  }
}

function onClick(e: MouseEvent) {
  if (transitioning) return;
  const t = e.target as Element | null;
  if (!(t instanceof Element)) return;
  const a = t.closest('a[href]') as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!/^\/(?!\/)/.test(href)) return; // 只处理站内绝对路径（排除 // 协议相对外链）

  const cur = strip(location.pathname);

  if (a.hasAttribute('data-pt')) {
    const rect = a.getBoundingClientRect();
    e.preventDefault();
    transitioning = true;
    scrollLock(true);
    const rec: Rec = {
      url: strip(href),
      src: cur,
      pt: a.getAttribute('data-pt')!,
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      r: cardRadius(a),
      sy: scrollY,
    };
    write(rec);
    openFrom(a, rec);
    window.setTimeout(() => {
      location.href = href;
    }, 455);
    return;
  }

  // 文章页返回链接：来源页就是目标页时保留记录，让目标页播"缩回卡片"；否则当普通跳转
  if (a.hasAttribute('data-backlink')) {
    const rec = read();
    if (rec && rec.src === strip(href) && rec.url === cur) return;
    clear();
    return;
  }

  // 其余站内链接（导航 / dock 等）：不是"从卡片返回"，清掉记录
  clear();
}

if (!reduced && !small) {
  document.addEventListener('click', onClick);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    // 模块通过 Base 的 import 执行，先于 Base 脚本体（Lenis 还没建）——setScroll 会落到原生
    // window.scrollTo；Lenis 构造时会读取当前滚动值接管，不会打架。首页 fx 的
    // autoDone 在模块之后初始化，读得到 __pt.skipIntro。
    boot();
  }
  // bfcache 恢复：脚本不重跑（intro 的 autoDone 也冻结了），靠 pageshow 补播返回动画
  addEventListener('pageshow', (e) => {
    if (e.persisted) {
      const rec = read();
      if (rec && rec.src === strip(location.pathname)) {
        clear();
        backTo(rec);
      }
    }
  });
}