/* ============================================================
   写作台的机器：台车随行走 + 灯跟着台车 + 打字杆 / 卷筒 / 铃。
   ------------------------------------------------------------
   物理数值照抄 Typewriter-Nocturne 的 carriage-physics.ts：
     子步 1/480 秒、dt 夹在 [0,0.05]、棘轮（加速度 + 限速 + 撞到底的弹性恢复）、
     弹簧一律 omega = 2πf、stiffness = omega²、damping = 2ζ·omega。
   为什么抄它：棘轮那条「冲到终点、撞回去一点」的运动和 9~13Hz 的弹簧是一台真机器的节拍。
   用 tween 做出来的是「匀速滑过去」，一看就是软件。
   ⚠ 挂在 window.__fx 的统一 rAF 上，不自起第二个循环（项目规矩）。
   ⚠ 每帧只写 CSS 变量，且写之前先量化比对（0.25px / 0.05°）——
     改宽度是每帧重排；不量化的话静止时也在每帧重绘。
   ============================================================ */

const SUBSTEP = 1 / 480;

/** 前进 = 打字棘轮；后退 = 回车簧（更软更慢，最后撞在左挡板上） */
const ESCAPEMENT = { accel: 60000, max: 3200, rest: 0.22 };
const CARRIAGE_RETURN = { accel: 14000, max: 2600, rest: 0.3 };

const spring = (f: number, ratio: number) => {
  const omega = 2 * Math.PI * f;
  return { omega, k: omega * omega, c: 2 * ratio * omega };
};
const STRIKE = spring(9, 0.5);    // 打字杆
const LIFT = spring(10, 0.6);     // 台车被顶起一丝
const PLATEN = spring(6, 0.9);    // 卷筒过纸，带回弹
const FEED = spring(13, 1.0);     // 纸舌走一格：临界阻尼，只滑不颤
const SWAY = spring(4.2, 0.16);   // 台车悬在带上摆

const STRIKE_TRAVEL = 3.5;   // px
const LIFT_TRAVEL = 7;       // px
const PLATEN_TRAVEL = 10;    // 度
const FEED_TRAVEL = 12;      // px
const SWAY_LEN = 3600;       // px：吊长，决定同样加速度下摆多大
const SWAY_MAX = 0.09;       // rad：约 5.2°，再多就看出是块板在晃
/** 台车一次跳回超过 4 个字宽才算「回车」，而不是「删了几个字」 */
const RETURN_CELLS = 4;
/** 光标那一行的底边离轨道多远（卷纸之后停在压纸杆上方这一点） */
const PLATEN_GAP = 10;
/**
 * 把打字面的排印属性抄给一个镜像元素。台车量插入点、压印量刚敲那个字的方框，
 * 靠的都是「镜像和真的那一栏逐字对齐」—— 抄漏一项，宽度和换行点就全错，
 * 所以这份清单只留一处（desk-machine 与 desk-ink 共用）。
 */
const TYPE_PROPS = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
  'letterSpacing', 'paddingLeft', 'paddingRight', 'tabSize',
  // textarea 有 margin-inline: -0.5em，镜像不跟着左移就整体偏出半格：
  // 台车领先光标一格，压印那个「重一档的字」落在后一格里，再慢慢淡掉
  'marginLeft',
  // 纵向同理：textarea 自己的 padding-top（0.15em）不抄，基线就比真字高 2.25px，
  // 压印浮在正文上方 —— 用户看到的就是「两层不重叠」
  'paddingTop',
] as const;

export function copyTypeStyles(cs: CSSStyleDeclaration, to: HTMLElement) {
  for (const p of TYPE_PROPS) (to.style as Record<string, string>)[p] = cs[p];
}

type Opts = {
  input: HTMLTextAreaElement;
  rail: HTMLElement;
  reduced: boolean;
  /** 压纸杆在屏幕上的 y；返回 null = 还没起来，用 CSS 那台的轨道顶边上方 PLATEN_GAP */
  bail?: () => number | null;
  /** 纸往下推或收回来多少 px：压印那几笔和阅读导引存的都是文档坐标，得跟着挪 */
  onTuck: (delta: number) => void;
  onBell: () => void;
  onReturn: () => void;
};

export function startMachine({ input, rail, reduced, bail: bailOf, onTuck, onBell, onReturn }: Opts) {
  const root = document.documentElement;
  const written = new Map<string, string>();
  const put = (k: string, v: string) => {
    if (written.get(k) !== v) {
      written.set(k, v);
      root.style.setProperty(k, v);
    }
  };
  const px = (v: number) => `${Math.round(v * 4) / 4}px`;
  const deg = (v: number) => `${Math.round(v * 20) / 20}deg`;
  const num = (v: number) => (Math.round(v * 20) / 20).toFixed(2);

  // ---- 光标在哪：镜像只装「当前这一逻辑行」，所以它的大小恒定 ----
  // 整段镜像 textarea 要复制几千行；只镜像光标所在那一行，量出来的 x 和折行行号完全一样。
  const mirror = document.createElement('div');
  mirror.className = 'deskmirror';
  mirror.setAttribute('aria-hidden', 'true');
  const probe = document.createElement('i');        // 绝对定位，不进这一行的流
  probe.textContent = 'm';
  const line = document.createElement('div');
  const marker = document.createElement('span');    // 零宽：它的 rect 就落在插入点上
  const lineProbe = document.createElement('span'); // 零宽：标在当前这条逻辑行的行首
  line.append(marker);
  mirror.append(probe, line);
  input.parentElement?.appendChild(mirror);

  let railLeft = 0;
  let railW = 0;
  let lineH = 22;
  let cell = 9;

  /** 把 textarea 的排印属性抄给镜像 —— 抄漏一项，量出来的宽度和换行点就都对不上 */
  function syncMirror() {
    const cs = getComputedStyle(input);
    copyTypeStyles(cs, mirror);
    mirror.style.width = `${input.clientWidth}px`;
    lineH = Number.parseFloat(cs.lineHeight) || 22;
    cell = probe.getBoundingClientRect().width || cell;
  }

  function measure() {
    syncMirror();
    railLeft = rail.getBoundingClientRect().left;
    railW = rail.clientWidth;
    const start = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(start);
    const brk = after.indexOf('\n');
    const lineStart = before.lastIndexOf('\n') + 1;
    // 镜像里要装「这一整块里光标之前的全部文本」，光标的 y 才是真的：只装当前那一条逻辑行的话
    // 镜像永远贴在包裹层顶上，量出来的 top 是块的顶、不是那一行的顶（keepOnPlaten 就是这么错的）。
    // 行首再放一个零宽探针，用来单独算「这一条逻辑行折到第几行」—— 软换行的铃按那个判断。
    line.textContent = '';
    line.append(document.createTextNode(before.slice(0, lineStart)));
    line.append(lineProbe);
    line.append(document.createTextNode(before.slice(lineStart)));
    line.append(marker);
    line.append(document.createTextNode(brk < 0 ? after : after.slice(0, brk)));
    const m = marker.getBoundingClientRect();
    const top = mirror.getBoundingClientRect().top;
    return {
      x: m.left - railLeft,
      // 光标折到这一逻辑行的第几行了 —— 换行从它判断，不从字符数判断（中文一个字占两个字宽）
      row: Math.max(0, Math.round((m.top - lineProbe.getBoundingClientRect().top) / lineH)),
      // 光标那一行在屏幕上的 y（卷纸按它判断）
      y: m.top,
      absRow: Math.max(0, Math.round((m.top - top) / lineH)),
    };
  }

  let tuck = 0;      // 稿纸被往下推了多少 px（写在 --desk-tuck 上，见 ridePlaten）

  function setTuck(v: number) {
    const next = Math.max(0, Math.round(v));
    const d = next - tuck;
    if (!d) return;
    tuck = next;
    put('--desk-tuck', `${next}px`);
    onTuck(d);
  }

  /**
   * 打字机永远在压纸杆那一行打字。它的 layout() 里这件事是白得的：网格按底部钉住，
   * `gridY = textBottom − rows·LINE`，而 `textBottom = bailY − 16` —— 光标那一行恒在压杆上方。
   * 我们是一张会滚的文档纸，得自己做到，而且是「推纸」不是「挪机器」：机器恒在视口底下，
   * 正在打的那一线落到杆上，已经打过的往上走 —— 和真机器过纸同一个方向。
   *   --desk-tuck = 稿纸往下推的量。它只有两个取值：光标那一行还在杆上方就推到刚好，
   *   已经在杆底下就归零、改滚文档把那一线顶上来（真机器上底下那些行本来就要转到杆后面去）。
   * 于是空白稿纸第一条线就落在杆上，每敲一行 tuck 退一行（实测 21px = 一行），
   * 退到头（tuck 归 0）之后开始滚 —— 用户看到的就是「杆跟着写字的行数走」。
   */
  function ridePlaten(caretTop: number) {
    // 压纸杆那一条线只有一个出处：三维那台起来了就按 desk-stage 算的那条，没起来用 CSS 轨道的顶边
    const bail = bailOf?.() ?? rail.getBoundingClientRect().top - PLATEN_GAP;
    // 按「摘掉当前推量之后」的位置算，推量才是绝对值，不会每轮累加漂移
    const d = bail - (caretTop + lineH - tuck);
    setTuck(Math.max(0, d));
    if (d >= -0.5) return;
    const y = scrollY - d;
    // 走 lenis：直接 window.scrollTo 会被它抢回去（全站规矩）
    const lenis = (window as any).__lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  }

  let pos = 0;
  let vel = 0;
  let prevVel = 0;
  let target = 0;
  let row = 0;
  let isReturn = false;
  let armed = true;      // 右边界铃的滞回开关
  let tilt = 0;
  let tiltVel = 0;
  let strike = 0;
  let lift = 0;
  let platen = 0;
  let feed = 0;
  let spool = 0;       // 色带卷轴转过多少弧度：每打一键前进一点（它那儿也是这么累加的）
  let bellA = 0;
  let acc = 0;
  let last = performance.now();
  const sVel = { v: 0 };
  const lVel = { v: 0 };
  const pVel = { v: 0 };
  const fVel = { v: 0 };

  function seek() {
    const m = measure();
    // 光标从左半边走回右边，重新上一次弦；折回上一行也算
    if (m.x < railW - cell * RETURN_CELLS || m.row < row) armed = true;
    if (m.row > row) onBell();          // 软换行：铃和回车撞在一起的那一下
    else if (m.x > railW - cell * 1.2 && armed) onBell();   // 顶到右边距

    if (m.x - pos < -cell * RETURN_CELLS) {
      if (!isReturn) onReturn();
      isReturn = true;
    } else if (m.x > pos) {
      isReturn = false;
    }
    row = m.row;
    ridePlaten(m.y);     // 卷纸：正在打那一行永远落在压纸杆上（先推纸，推满了才滚）
    target = Math.max(0, Math.min(railW, m.x));
    if (reduced) {
      pos = target;
      vel = 0;
      write();
    } else if (vel === 0 && Math.abs(target - pos) < 0.5) {
      write();   // 减动效之外也要能立刻落位一次（比如刚进页面）
    }
    arm();
  }

  function ring() {
    if (!reduced) bellA = 1;
  }

  /** 冲量：让弹簧第一次摆到 travel 附近（v0 = travel·omega，0.9 是实测的阻尼修正） */
  function kick(s: ReturnType<typeof spring>, state: { v: number }, travel: number) {
    state.v += travel * s.omega * 0.9;
  }

  function strikeKey() {
    if (reduced) return;
    kick(STRIKE, sVel, STRIKE_TRAVEL);
    kick(LIFT, lVel, LIFT_TRAVEL);
    spool += 0.07;   // 它那台每打一键卷轴转 0.07 弧度，色带换一格没打过的布
  }

  function lineFeed() {
    if (reduced) return;
    kick(PLATEN, pVel, PLATEN_TRAVEL);
    kick(FEED, fVel, FEED_TRAVEL);
  }

  function step(s: ReturnType<typeof spring>, p: number, v: number, h: number, impulse: number) {
    const a = -s.k * p - s.c * v + impulse;
    const nv = v + a * h;
    return [p + nv * h, nv] as const;
  }

  function substep(h: number) {
    const r = isReturn ? CARRIAGE_RETURN : ESCAPEMENT;
    const dir = Math.sign(target - pos);
    if (dir !== 0) vel += r.accel * h * dir;
    vel = Math.max(-r.max, Math.min(r.max, vel));
    const next = pos + vel * h;
    if (dir !== 0 && Math.sign(target - next) !== dir) {
      pos = target;
      vel = -vel * r.rest;                    // 撞到底、弹回去一点 = 那一声「嗒」
      if (Math.abs(vel) < 12) vel = 0;
      if (isReturn) isReturn = false;
    } else {
      pos = next;
    }
    if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 24) {
      pos = target;
      vel = 0;
    }

    // 摆动：支点（台车）的水平加速度喂给一个吊长 SWAY_LEN 的单摆
    const [nt, nv] = step(SWAY, tilt, tiltVel, h, -(vel - prevVel) / h / SWAY_LEN);
    tilt = Math.max(-SWAY_MAX, Math.min(SWAY_MAX, nt));
    tiltVel = nv;

    [strike, sVel.v] = step(STRIKE, strike, sVel.v, h, 0);
    [lift, lVel.v] = step(LIFT, lift, lVel.v, h, 0);
    [platen, pVel.v] = step(PLATEN, platen, pVel.v, h, 0);
    [feed, fVel.v] = step(FEED, feed, fVel.v, h, 0);
    // 铃的余响走指数衰减：金属的余音没有「回摆」，用弹簧会做出一个来回颤的铃
    bellA *= Math.exp(-h / 0.45);
    if (bellA < 0.01) bellA = 0;
    prevVel = vel;
  }

  function write() {
    put('--car-x', px(pos));
    put('--car-tilt', deg((tilt * 180) / Math.PI));
    put('--car-lift', px(-lift));
    put('--strike', px(strike));
    put('--platen', deg(platen));
    put('--feed', px(feed));
    put('--bell-a', num(bellA));
    put('--lamp-x', px(railLeft + pos));   // 光斑中心：跟着台车走
  }

  // ⚠ 自己取时间：Base 那个统一 rAF 调回调时**不传参**（`for (const f of __fx) f()`），
  //   接了 now 参数就是每帧拿到 undefined → dt 成 NaN → 每帧直接 return，台车永远不动。
  //   和 readguide.ts 一样用 performance.now()（和 rAF 那个 time 同一个原点）。
  function frame() {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) return;
    // 切后台回来那一大段不能整个当步长：一帧算几百个子步是白算，而且会直接把弹簧打飞
    if (dt > 0.05) dt = 0.05;
    acc += dt;
    let guard = 0;
    while (acc >= SUBSTEP && guard++ < 64) {
      substep(SUBSTEP);
      acc -= SUBSTEP;
    }
    if (guard >= 64) acc = 0;
    write();
  }

  const fx: ((...a: any[]) => void)[] = ((window as any).__fx ??= []);
  function arm() {
    if (reduced || fx.includes(frame)) return;
    fx.push(frame);
  }

  // 台车轨道的宽度就是正文可打宽：写作台一 resize（窗口变、抽屉开）就要重量一遍
  const ro = new ResizeObserver(seek);
  ro.observe(input);
  addEventListener('resize', seek);
  // ⚠ 监听挂在 textarea 自己身上：selectionchange **不冒泡**，
  //   document 上那个只对 contenteditable 有效 —— 挂错了地方就是「点哪儿台车都不动」
  //   （实测：真鼠标点进第二行中间，--car-x 一直停在 0px）。
  input.addEventListener('selectionchange', seek);
  // 聚焦那一下浏览器只负责把它滚进视口（Tab 进来时可能停在机器底下）；
  // 「光标那一行要落在压纸杆上」归 ridePlaten 管，等它滚完再量一次
  input.addEventListener('focus', () => requestAnimationFrame(seek));

  seek();
  arm();

  return {
    strikeKey,
    lineFeed,
    ring,
    seek,
    /**
     * 三维那台每一帧读这一份：台车、摆、打字杆、卷筒、卷轴。物理只许有一份，
     * 那边再算一遍就一定漂（量纲照它 machineState() 的约定：位移都归一化到 0~1，转角用弧度）。
     */
    readout: () => ({
      headX: railLeft + pos,
      sway: tilt,
      strike: strike / STRIKE_TRAVEL,
      vibrator: lift / LIFT_TRAVEL,
      spool,
      platenTurn: platen / 360,
    }),
    destroy() {
      const i = fx.indexOf(frame);
      if (i >= 0) fx.splice(i, 1);
      ro.disconnect();
      removeEventListener('resize', seek);
      input.removeEventListener('selectionchange', seek);
      mirror.remove();
    },
  };
}
