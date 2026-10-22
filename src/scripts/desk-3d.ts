/* ============================================================
   写作台的三维机器：把 desk-3d/typewriter-machine.js 那台模型接到这一页上。
   ------------------------------------------------------------
   为什么要有它：CSS 那台画不出「纸钻进机器」—— 压纸杆、打字头、色带架是在纸的**前面**的，
   卷筒和机身在纸的**后面**，中间靠一张隐形遮挡体（occluder）分开，所以 DOM 上那栏字能透过纸
   露出来，而机器零件压在字上。这件事没有第二画法，抄它的（MIT，见 docs/licenses/）。

   ⚠ 物理只有一份：台车在哪、摆多少、打杆沉多深，全部从 desk-machine.ts 的 readout() 读，
     这里只负责画。两份物理一定漂。
   ⚠ 版位也只有一份：stage 由 desk-stage.ts 算，而 desk-stage 的纸宽是从 DOM 量回来的。
     所以这一台和 CSS 那台、和 ridePlaten 那条压纸杆线是同一个数。
   ⚠ 不进第二个 rAF：渲染由页面挂在 window.__fx 上，只在状态或版位真的变了的那一帧画。
   ⚠ 起不来就退回 CSS 那台：没有 WebGL、上下文丢了（webglcontextlost）、或者减动效 + 软件渲染。
   ============================================================ */

import { deskStageLayout, platenLine, type DeskStage } from './desk-stage';
import { SCENE3D, type DeskSettings } from './desk-studio';

/** desk-machine.ts 交出来的那一份物理状态 */
export type Desk3dReadout = {
  headX: number;
  sway: number;
  strike: number;
  vibrator: number;
  spool: number;
  platenTurn: number;
};

type Opts = {
  canvas: HTMLCanvasElement;
  paper: HTMLElement;
  input: HTMLTextAreaElement;
  settings: () => DeskSettings;
  /** 物理那一份；机器还没建起来时给 null，这一帧就不画 */
  readout: () => Desk3dReadout | null;
  reduced: boolean;
  /** 模型着色器编好了、可以画了（页面在这一步才把 CSS 那台摘掉，避免两台同时露出来） */
  onReady: () => void;
};

export type Desk3d = {
  stage: () => DeskStage;
  platen: () => number;
  /** 版位、主题、字号、字体变了都要重来一次 */
  refresh: () => void;
  /** 一帧：返回真的画了没有（没画成说明还在编译着色器，页面继续显示 CSS 那台） */
  frame: () => boolean;
  dispose: () => void;
};

/** 等宽字一格的宽度：拿 canvas 量 'M'，和它那份 preview 同一个办法（不量 DOM，省一次重排） */
let measureCtx: CanvasRenderingContext2D | null = null;
function cellWidth(input: HTMLTextAreaElement) {
  const cs = getComputedStyle(input);
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return 9;
  measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`.trim();
  return measureCtx.measureText('M').width || 9;
}

export async function startDesk3d(o: Opts): Promise<Desk3d | null> {
  const mod = await import('./desk-3d/typewriter-machine.js');
  let machine: any = null;
  try {
    machine = mod.createMachine(o.canvas, () => {
      o.onReady();
    });
  } catch {
    return null;
  }
  if (!machine) return null;

  const vw = () => document.documentElement.clientWidth;
  const vh = () => document.documentElement.clientHeight;
  let stage = deskStageLayout(vw(), vh(), { x: 0, width: 1 });
  let spec: Record<string, unknown> | null = null;

  function buildSpec() {
    const root = getComputedStyle(document.documentElement);
    const tok = (n: string) => root.getPropertyValue(n).trim();
    const s = o.settings();
    const scene = SCENE3D[s.theme] ?? SCENE3D.paper;
    const pr = o.paper.getBoundingClientRect();
    // ⚠ 一律用 clientWidth / clientHeight，不用 innerWidth：后者含滚动条那 15px，
    //   而 DOM 是排在去掉滚动条那一条版面里的 —— 用 innerWidth 整台机器往右偏半个滚动条
    const w = vw();
    const h = vh();
    stage = deskStageLayout(w, h, { x: pr.left, width: pr.width });
    const cell = cellWidth(o.input);
    const box = o.input.getBoundingClientRect();
    const pad = Number.parseFloat(getComputedStyle(o.input).paddingLeft) || 0;
    // 一格 = 一个等宽字符；可打宽 = 文本的内容盒（那两道内边距不算，棘轮是按字格咬的）
    const textW = Math.max(cell, box.width - pad * 2);
    o.canvas.style.width = `${w}px`;
    o.canvas.style.height = `${h}px`;
    return {
      layout: stage,
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      // 减动效那一路只要一张会动的机器不好看，但静态那一帧还是要画出来，所以降档不关掉
      quality: o.reduced ? 'low' : w * h > 1_400_000 ? 'high' : 'medium',
      grid: { left: box.left + pad, cols: Math.max(20, Math.floor(textW / cell)), cellWidth: cell },
      theme: {
        room: tok('--desk-room'),
        light: tok('--desk-lamp'),
        source: scene.source,
        trim: tok('--desk-trim'),
        environment: scene.environment,
        exposure: scene.exposure,
        // 上游那一份只有一套机器的概念：金属、色带、机身漆全是写死的。这一站有四套主题，
        // 机器必须跟着走，所以把那几条 token 一起交下去（写死的值在模型里留作兜底）。
        metal: tok('--desk-metal'),
        metalHi: tok('--desk-metal-hi'),
        metalLo: tok('--desk-metal-lo'),
        ribbon: tok('--desk-ribbon'),
        edge: tok('--desk-room-edge'),
      },
      paper: { color: tok('--desk-paper'), appearance: scene.appearance },
      serif: tok('--desk-serif'),
    };
  }

  let key = '';
  function refresh() {
    const next = buildSpec();
    // 重建整台模型 = 重造几何 + 重新编译着色器（Windows 上走 D3D 的编译器，物理材质要好几秒），
    // 所以只有版位 / 主题 / 字格 / 档位真的变了才重建。它那份控制器也是同一个办法（surfaceKey）。
    const k = JSON.stringify([
      next.layout.width, next.layout.height, next.layout.sheet, next.layout.bailY,
      next.grid, next.theme, next.paper, next.quality, next.pixelRatio,
    ]);
    if (k === key) return;
    key = k;
    spec = next;
    machine.build(spec);
  }

  function frame() {
    const r = o.readout();
    if (!r) return false;
    const s = o.settings();
    return machine.render({
      headX: r.headX,
      sway: r.sway,
      strike: r.strike,
      vibrator: r.vibrator,
      spool: r.spool,
      platenTurn: r.platenTurn,
      lamp: s.intensity > 0.001,
      intensity: s.intensity,
    });
  }

  refresh();

  return {
    stage: () => stage,
    platen: () => platenLine(stage),
    refresh,
    frame,
    dispose() {
      machine.dispose();
      machine = null;
    },
  };
}
