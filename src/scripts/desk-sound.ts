/* ============================================================
   写作台的声音：击键 / 回车 / 铃，全部当场合成，零音频文件。
   ------------------------------------------------------------
   抄的是 Typewriter-Nocturne 的 sound-engine.ts 那套做法：
   用 OfflineAudioContext 先把每个声音渲染成一段 PCM（几个变体轮换用，
   免得连打听起来像同一台机器在复制粘贴），真按键时只是 BufferSource 播一下。
   为什么不在按键瞬间现算：那要把三条振荡器 + 噪声源 + 包络在主线程一次排完，
   正好落在最不该卡的那 8ms 里。
   ⚠ AudioContext 必须等第一次真的出声才建（浏览器不让没手势的上下文跑起来），
     而且关了开关就 close()，不留一个空转的音频设备。
   ============================================================ */

const SR = 44100;

type Kind = 'key' | 'return' | 'bell';

const VOICE = {
  body: 140,          // 机身那一声闷响（Hz）
  bodyGain: 0.9,
  click: 2600,        // 噪声击经过高通之后的「脆」
  clickGain: 0.75,
  ring: 3300,         // 金属余音
  ringGain: 0.16,
};

const rnd = (a: number) => (Math.random() * 2 - 1) * a;

function noiseBuffer(oc: BaseAudioContext, dur: number) {
  const b = oc.createBuffer(1, Math.ceil(dur * SR), SR);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** 一条指哪打哪的包络：attack 秒冲顶，decay 秒指数落到 0 */
function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

async function renderKey(): Promise<AudioBuffer> {
  const dur = 0.16;
  const oc = new OfflineAudioContext(1, Math.ceil(dur * SR), SR);
  const t0 = 0.001;

  // 脆响：白噪 → 高通（把低频糊掉，只剩那一下「嗒」）
  const src = oc.createBufferSource();
  src.buffer = noiseBuffer(oc, 0.03);
  const hp = oc.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = VOICE.click + rnd(200);
  hp.Q.value = 0.9;
  const cg = oc.createGain();
  env(cg, t0, VOICE.clickGain, 0.0006, 0.012);
  src.connect(hp).connect(cg).connect(oc.destination);
  src.start(t0);

  // 机身：正弦从 1.6 倍频落到本频（那一下是有音高的，不是纯噪声）
  const thump = oc.createOscillator();
  thump.frequency.setValueAtTime(VOICE.body * 1.6, t0);
  thump.frequency.exponentialRampToValueAtTime(VOICE.body, t0 + 0.02);
  const tg = oc.createGain();
  env(tg, t0, VOICE.bodyGain, 0.001, 0.05);
  thump.connect(tg).connect(oc.destination);
  thump.start(t0);
  thump.stop(t0 + 0.09);

  // 金属余音：带通 Q=16，只留一条很窄的 ringing
  const ring = oc.createOscillator();
  ring.frequency.value = VOICE.ring + rnd(180);
  const bp = oc.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = VOICE.ring;
  bp.Q.value = 16;
  const rg = oc.createGain();
  env(rg, t0, VOICE.ringGain, 0.001, 0.1);
  ring.connect(bp).connect(rg).connect(oc.destination);
  ring.start(t0);
  ring.stop(t0 + 0.12);

  // 垫底：一整条宽噪，让这声不显得「只有三个元件」
  const floor = oc.createBufferSource();
  floor.buffer = noiseBuffer(oc, 0.05);
  const fbp = oc.createBiquadFilter();
  fbp.type = 'bandpass';
  fbp.frequency.value = VOICE.click * 0.7;
  fbp.Q.value = 2;
  const fg = oc.createGain();
  env(fg, t0, VOICE.clickGain * 0.28, 0.002, 0.04);
  floor.connect(fbp).connect(fg).connect(oc.destination);
  floor.start(t0);

  return oc.startRendering();
}

async function renderReturn(): Promise<AudioBuffer> {
  const dur = 0.7;
  const oc = new OfflineAudioContext(1, Math.ceil(dur * SR), SR);

  // 棘轮：回程路上连着五下齿响
  for (let i = 0; i < 5; i++) {
    const t = 0.012 + i * 0.026;
    const s = oc.createBufferSource();
    s.buffer = noiseBuffer(oc, 0.02);
    const bp = oc.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200 + rnd(400) + i * 120;
    bp.Q.value = 3;
    const g = oc.createGain();
    env(g, t, 0.5 - i * 0.05, 0.0006, 0.014);
    s.connect(bp).connect(g).connect(oc.destination);
    s.start(t);
  }

  // 滑：一条噪声带的中心频率从 1900 滑到 520，就是「车一路拖过去」那声
  const slide = oc.createBufferSource();
  slide.buffer = noiseBuffer(oc, 0.42);
  const lp = oc.createBiquadFilter();
  lp.type = 'bandpass';
  lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(1900, 0.02);
  lp.frequency.exponentialRampToValueAtTime(520, 0.42);
  const sg = oc.createGain();
  sg.gain.setValueAtTime(0.0001, 0.02);
  sg.gain.linearRampToValueAtTime(0.34, 0.06);
  sg.gain.exponentialRampToValueAtTime(0.0001, 0.44);
  slide.connect(lp).connect(sg).connect(oc.destination);
  slide.start(0.02);

  // 撞在左挡板上那一下
  const stop = oc.createOscillator();
  stop.frequency.setValueAtTime(VOICE.body * 1.4, 0.44);
  stop.frequency.exponentialRampToValueAtTime(VOICE.body * 0.8, 0.5);
  const og = oc.createGain();
  env(og, 0.44, 1.0, 0.001, 0.12);
  stop.connect(og).connect(oc.destination);
  stop.start(0.44);
  stop.stop(0.6);

  return oc.startRendering();
}

async function renderBell(): Promise<AudioBuffer> {
  const dur = 1.5;
  const oc = new OfflineAudioContext(1, Math.ceil(dur * SR), SR);
  // 三个泛音：基音 C#7、一个高八度再往上五度、一个中低泛音 —— 铜铃的拍频就是这几个数打架打出来的
  const partials = [2093, 5230, 3150];
  const gains = [0.3, 0.12, 0.2];
  const decays = [1.1, 0.5, 0.8];
  partials.forEach((f, i) => {
    const o = oc.createOscillator();
    o.frequency.value = f * (1 + rnd(0.004));
    const g = oc.createGain();
    env(g, 0.002, gains[i], 0.002, decays[i]);
    o.connect(g).connect(oc.destination);
    o.start(0.002);
    o.stop(0.002 + decays[i] + 0.1);
  });
  return oc.startRendering();
}

const VARIANTS: Record<Kind, number> = { key: 5, return: 2, bell: 2 };

export function createDeskSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  const pools = new Map<Kind, AudioBuffer[]>();
  const cursor = new Map<Kind, number>();
  let volume = 0.45;
  let building = false;

  async function build() {
    if (building || pools.size) return;
    building = true;
    try {
      const kinds: [Kind, () => Promise<AudioBuffer>][] = [
        ['key', renderKey],
        ['return', renderReturn],
        ['bell', renderBell],
      ];
      for (const [kind, render] of kinds) {
        const list: AudioBuffer[] = [];
        for (let i = 0; i < VARIANTS[kind]; i++) list.push(await render());
        pools.set(kind, list);
      }
    } finally {
      building = false;
    }
  }

  function ensureCtx(): AudioContext | null {
    if (ctx) return ctx;
    try {
      ctx = new AudioContext({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function play(kind: Kind) {
    const list = pools.get(kind);
    if (!list?.length) return;
    const c = ensureCtx();
    if (!c || !master) return;
    if (c.state === 'suspended') void c.resume();
    const i = (cursor.get(kind) ?? 0) % list.length;
    cursor.set(kind, i + 1);
    const src = c.createBufferSource();
    src.buffer = list[i];
    // 每次微调速率和增益：同一张 PCM 连打十次会听出是复制粘贴，±4.5% 速率就散了
    src.playbackRate.value = 1 + rnd(0.045);
    const g = c.createGain();
    g.gain.value = 1 + rnd(0.175);
    src.connect(g).connect(master);
    src.start();
    src.onended = () => src.disconnect();
  }

  return {
    play,
    /** 第一次开声音才要手势 + 才渲染，所以这两件事都放在这里 */
    async enable() {
      ensureCtx();
      await build();
    },
    disable() {
      try {
        void ctx?.close();
      } catch {}
      ctx = null;
      master = null;
    },
    setVolume(v: number) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
  };
}

export type DeskSound = ReturnType<typeof createDeskSound>;
