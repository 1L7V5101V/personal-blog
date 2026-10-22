/* ============================================================
   写作台的「调光台」：设置的数据形状、区间、持久化、抽屉接线。
   ------------------------------------------------------------
   这一份是数值的唯一出处：
     - 页面里每个滑块的 min/max/step 从 RANGES 读（不在 astro 里再写一遍数字）
     - 存进 localStorage 的按同一份区间夹一遍再 snap（手改存储不至于排不出界面）
     - 灯那几个派生量（光斑直径、透明度、渐变停靠点）也在这里算，
       CSS 只消费算好的变量 —— 两处各算一份必然对不上。
   数值来自 Typewriter-Nocturne（Chaosnap 的 Electron 终端）的 Studio 面板，
   区间和默认值照它抄；灯的高度不再参与明暗计算，理由见 lampVars 的注释。
   ============================================================ */

export type DeskThemeId = 'paper' | 'study' | 'moon' | 'portrait';

export const THEMES: { id: DeskThemeId; name: string; note: string }[] = [
  { id: 'paper', name: '纸与墨', note: '奶油纸面，黄铜机器，头顶一盏灯' },
  { id: 'study', name: '深夜书房', note: '深色纸面，台灯从右上打过来' },
  { id: 'moon', name: '月下', note: '蓝紫夜色，冷光从左上落' },
  { id: 'portrait', name: '人像', note: '这一站采样来的那几个色' },
];

export type DeskSettings = {
  theme: DeskThemeId;
  /** 纸的两副面孔：true = 整张纸等宽打字机字（源文不排，Nocturne 那张纸）；
      false = 排好的正文（和读者看到的一样）。默认是前者 —— 写作时先看机器，要看成品再切。 */
  typed: boolean;
  type: number;      // 字号（只管写作台的源，预览仍按文章页那套排）
  leading: number;   // 行距（同上）
  intensity: number; // 灯的亮度
  spread: number;    // 光锥角度
  height: number;    // 灯位高低（只改光斑大小）
  softness: number;  // 光边缘的软硬
  dust: number;      // 浮尘
  grain: number;     // 胶片颗粒
  volume: number;    // 击键声的音量
  sound: boolean;
  focus: boolean;    // 专注：把顶栏工具条和阅读导引都摘掉
};

export type Range = { min: number; max: number; step: number };

export const RANGES: Record<
  'type' | 'leading' | 'intensity' | 'spread' | 'height' | 'softness' | 'dust' | 'grain' | 'volume',
  Range
> = {
  type: { min: 11, max: 22, step: 0.5 },
  leading: { min: 1.2, max: 1.9, step: 0.05 },
  intensity: { min: 0, max: 2, step: 0.05 },
  spread: { min: 20, max: 160, step: 1 },
  height: { min: 0.2, max: 2, step: 0.05 },
  softness: { min: 0, max: 1, step: 0.01 },
  dust: { min: 0, max: 1, step: 0.05 },
  grain: { min: 0, max: 1, step: 0.01 },
  volume: { min: 0, max: 1, step: 0.05 },
};

export const DESK_DEFAULTS: DeskSettings = {
  theme: 'paper',
  typed: true,
  type: 15,
  leading: 1.4,
  intensity: 1,
  spread: 74,
  height: 1,
  softness: 0.65,
  dust: 0.45,
  grain: 0.1,
  volume: 0.45,
  sound: false,
  focus: false,
};

/** 一键三档：关 / 均衡 / 电影感（后两档抄 Nocturne 的 LIGHTING_PRESETS） */
export const LIGHT_PRESETS: Record<string, Pick<DeskSettings, 'intensity' | 'spread' | 'height' | 'softness' | 'dust' | 'grain'>> = {
  off: { intensity: 0, spread: 74, height: 1, softness: 0.65, dust: 0, grain: 0.06 },
  balanced: { intensity: 1, spread: 74, height: 1, softness: 0.65, dust: 0.45, grain: 0.1 },
  cinematic: { intensity: 1.35, spread: 96, height: 1.25, softness: 0.75, dust: 0.75, grain: 0.25 },
};

const KEY = 'blog-desk:v1';

const clamp = (v: number, r: Range) => Math.min(r.max, Math.max(r.min, v));
/** snap 到 step，免得存储里留下 0.30000000000000004 这种值（滑块的 value 也要能对上） */
const snap = (v: number, r: Range) => Math.round(v / r.step) * r.step;

export function loadDesk(): DeskSettings {
  const s: DeskSettings = { ...DESK_DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return s;
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (THEMES.some((t) => t.id === d.theme)) s.theme = d.theme as DeskThemeId;
    for (const k of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
      const v = d[k];
      if (typeof v === 'number' && Number.isFinite(v)) s[k] = snap(clamp(v, RANGES[k]), RANGES[k]);
    }
    s.sound = d.sound === true;
    s.focus = d.focus === true;
    // 老存储里没有这一项：默认给「打字机字」那一副面孔（和 DESK_DEFAULTS 一致）
    s.typed = d.typed !== false;
  } catch {
    /* 存储读不出来就用默认值：这一层不该有能力挡住写作 */
  }
  return s;
}

export function saveDesk(s: DeskSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/**
 * 灯的几个派生量。光是两层，各干一件事：
 *   `.desklamp` 全屏**乘**一层黑 —— 「这间屋子整体有多暗」，静止不动；
 *   `.deskglow` 跟着台车走的一团**屏**光 —— 「灯照着哪一点」，只有它在动。
 * 于是「亮度」这个滑条同时动两处：
 *   压暗 = shade·(1.1 − 0.4·intensity)  —— 灯越亮，屋子越回得来
 *   光团不透明度 = 0.06 + 0.42·intensity —— 灯灭时整团摘掉（.desk-off 直接 display:none）
 * ⚠ 这两条和 Nocturne 的 ambient 项是**反的**：它写得越亮、周围压得越狠（对比更强），
 *   而全屏压暗跟着亮度升会让屋子读起来更黑，正是要避开的那种「调了反而更糟」。
 *   它那边光是 WebGL 里按距离平方累加的，明暗由曝光一起解；这里没有着色器，
 *   所以保留「灯亮 = 房间亮」这个意图，不保留它的算法。
 * ⚠ 灯位（height）只改光斑**大小**和纵向位置，不改明暗：
 *   照搬一遍距离衰减就等于「把灯抬高 = 屋子变暗」，那是调光台里最讨人嫌的耦合。
 * ⚠ shade 在 TS 而颜色在 CSS：这四个主题是成对写的，颜色要能被抽屉里的色板卡继承，
 *   shade 只参与这里的计算。改一处必须同时想另一处。
 */
const SHADE: Record<DeskThemeId, number> = {
  paper: 0.42,
  study: 0.5,
  moon: 0.48,
  portrait: 0.42,
};

/**
 * 三维那台机器（desk-3d.ts）要的几个数：灯是哪一种、环境反射多强、曝光多少、纸是亮纸还是暗纸。
 * 颜色**不在这里** —— room / lamp / trim / paper 全部从 computed style 读那四条 `[data-desk-theme]`，
 * 这儿放的只能是「参与 WebGL 计算、进不了 CSS」的枚举和系数（和上面 SHADE 同一条道理）。
 * 前三行对着它 themes.ts 里那三套原样搬（paper-and-ink / midnight-study / moonlit-poetry 的 scene 段），
 * portrait 是这一站自己采样那套：灯按台灯走，环境反射和曝光压在深夜书房同一档。
 * ⚠ 改一套主题必须同时动 global.css 那四条和这张表（还有 SHADE）。
 */
export const SCENE3D: Record<
  DeskThemeId,
  { source: 'carriage' | 'desk-lamp' | 'moonlight'; environment: number; exposure: number; appearance: 'light' | 'dark' }
> = {
  paper: { source: 'carriage', environment: 0.55, exposure: 1, appearance: 'light' },
  study: { source: 'desk-lamp', environment: 0.32, exposure: 0.9, appearance: 'dark' },
  moon: { source: 'moonlight', environment: 0.3, exposure: 0.85, appearance: 'dark' },
  portrait: { source: 'desk-lamp', environment: 0.32, exposure: 0.92, appearance: 'light' },
};
/** 压暗的上限。Nocturne 用 24 轮二分现算「墨色还看得见」的 WCAG 地板；
    这里每套主题的纸和墨都是定死的，所以直接把地板写成一个数：再多就把字压没了 */
const DARK_MAX = 0.72;

export function lampVars(s: DeskSettings) {
  const shade = SHADE[s.theme] ?? 0.42;
  const edge = Math.max(0.05, Math.min(DARK_MAX, shade * (1.1 - 0.4 * s.intensity)));
  // 光斑直径：灯位越高摊得越开，光锥越宽摊得越开（单位 = 视口宽的倍数）
  const dia = (0.55 + 0.55 * s.height) * (0.55 + s.spread / 160);
  return {
    '--desk-dark': edge.toFixed(3),
    '--desk-lamp-d': `calc(${dia.toFixed(3)} * 100vw)`,
    // 中心那团灯光的浓度：越柔，中心越淡（光摊开了，没有热点）
    '--desk-lamp-in': String(Math.round(100 - 45 * s.softness)),
    // 实心核占到半径几成，剩下那截就是柔边。反过来写会拧着：softness 越大应该越早开始衰减
    '--desk-lamp-mid': String(Math.round(85 - 60 * s.softness)),
    '--desk-glow-a': s.intensity <= 0.001 ? '0' : Math.min(0.62, 0.06 + 0.42 * s.intensity).toFixed(3),
    '--desk-dust-a': s.dust.toFixed(2),
    // 颗粒：1.5/255 那点常驻（关掉滑块也看得见纸浆），上限跟着滑条走
    '--desk-grain-a': (1.5 / 255 + s.grain * 0.045).toFixed(4),
  } as Record<string, string>;
}

export function applyDesk(s: DeskSettings) {
  const el = document.documentElement;
  el.dataset.deskTheme = s.theme;
  el.style.setProperty('--desk-type', `${s.type}px`);
  el.style.setProperty('--desk-leading', String(s.leading));
  // 灯离纸多高：只进光斑的纵向位置，不进亮度（理由见 lampVars）
  el.style.setProperty('--desk-lamp-lift', `${(26 + s.height * 44).toFixed(1)}px`);
  for (const [k, v] of Object.entries(lampVars(s))) el.style.setProperty(k, v);
  el.classList.toggle('desk-off', s.intensity <= 0.001);
  el.classList.toggle('desk-focus', s.focus);
  // 两副面孔：这一条决定纸上是等宽源文还是排好的正文（样式在 global.css 的 .desk-typed 那一段）
  el.classList.toggle('desk-typed', s.typed);
}

/**
 * 接线：只认 data-desk / data-desk-toggle / data-desk-preset / data-desk-theme-card 这四种标记，
 * 每个控件的当前值从 RANGES 回填（所以 loadDesk 夹过的值一定会显示在滑条上）。
 * roots 可以不止一个：抽屉里那一堆旋钮和顶栏上的开关是同一批状态的两个入口，
 * 两边都要能改、也都要被回写（不然按了顶栏的「专注」，抽屉里的滑条还是旧样子）。
 */
export function startStudio(
  roots: HTMLElement[],
  get: () => DeskSettings,
  set: (patch: Partial<DeskSettings>) => void,
) {
  const sync = () => {
    const s = get();
    for (const root of roots) {
      root.querySelectorAll<HTMLElement>('[data-desk]').forEach((input) => {
        const k = input.dataset.desk as keyof DeskSettings;
        (input as HTMLInputElement).value = String(s[k]);
        const out = root.querySelector<HTMLElement>(`[data-out="${k}"]`);
        if (out) out.textContent = fmt(s[k] as number, RANGES[k as keyof typeof RANGES]);
      });
      root.querySelectorAll<HTMLElement>('[data-desk-toggle]').forEach((b) => {
        b.setAttribute('aria-pressed', String(!!s[b.dataset.deskToggle as keyof DeskSettings]));
      });
      root.querySelectorAll<HTMLElement>('[data-desk-theme-card]').forEach((c) => {
        c.setAttribute('aria-checked', String(c.dataset.deskThemeCard === s.theme));
      });
    }
  };

  for (const root of roots) {
    root.addEventListener('input', (e) => {
      const t = e.target as HTMLElement;
      const k = t.dataset?.desk;
      if (!k) return;
      const r = RANGES[k as keyof typeof RANGES];
      const v = Number((t as HTMLInputElement).value);
      if (!r || !Number.isFinite(v)) return;
      set({ [k]: snap(clamp(v, r), r) } as Partial<DeskSettings>);
    });

    root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(
        '[data-desk-toggle],[data-desk-preset],[data-desk-theme-card]',
      );
      if (!t) return;
      if (t.dataset.deskToggle) {
        const k = t.dataset.deskToggle as keyof DeskSettings;
        set({ [k]: !get()[k] } as Partial<DeskSettings>);
      }
      if (t.dataset.deskPreset) set({ ...LIGHT_PRESETS[t.dataset.deskPreset] });
      if (t.dataset.deskThemeCard) set({ theme: t.dataset.deskThemeCard as DeskThemeId });
    });
  }

  sync();
  return { sync };
}

function fmt(v: number, r?: Range) {
  if (!r) return String(v);
  // 步长 ≥1 的（光锥）不给小数，其余保留步长需要的那一位
  const digits = r.step >= 1 ? 0 : r.step >= 0.1 ? 1 : 2;
  return v.toFixed(digits);
}
