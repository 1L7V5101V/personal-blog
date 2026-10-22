/* ============================================================
   写作台的舞台版位：机器、纸、压纸杆在哪一条线上。
   ------------------------------------------------------------
   数值的出处是 Typewriter-Nocturne 的 app/nocturne/stage-layout.ts（MIT，见
   docs/licenses/MIT-typewriter-nocturne.txt）。那一份按视口自己算 sheet 宽，
   这一份不重复算 —— 纸的 x 和宽度由页面量回来（CSS 那条 --desk-sheet-w 同理），
   因为 100vw 含滚动条、布局宽度不含，Windows 上差 15px，两处各算一份就对不齐。
   ⚠ 改了这里的数，global.css 里 --machine-h / --desk-side / --desk-tray-w 那三条要一起看。
   ============================================================ */

export type DeskBox = { x: number; y: number; width: number; height: number };

export type DeskStage = {
  width: number;
  height: number;
  machineHeight: number;
  machineTop: number;
  sheet: DeskBox;
  platenY: number;
  platenRadius: number;
  /** 压纸杆：把纸压在卷筒上那根镀铬横杆 */
  bailY: number;
  /** 打字区：字结束在压纸杆上方，机器永远盖不住一个字符 */
  text: DeskBox;
};

export const SHEET_OVERHANG = 12;
/** 它的 layout() 里 text 的高度是 bailY − 16，那 16px 就是字和压杆之间留的缝 */
export const BAIL_GAP = 16;

export function deskStageLayout(width: number, height: number, sheet: { x: number; width: number }): DeskStage {
  const machineHeight = Math.min(300, Math.max(160, height * 0.3));
  const machineTop = height - machineHeight;
  const platenRadius = machineHeight * 0.12;
  const platenY = machineTop + machineHeight * 0.24;
  const bailY = machineTop + machineHeight * 0.08;
  const textHeight = Math.max(80, Math.round(bailY - BAIL_GAP));
  return {
    width,
    height,
    machineHeight,
    machineTop,
    sheet: { x: sheet.x, y: -SHEET_OVERHANG, width: sheet.width, height: platenY + SHEET_OVERHANG },
    platenY,
    platenRadius,
    bailY,
    text: { x: sheet.x, y: 0, width: sheet.width, height: textHeight },
  };
}

/** 正在打那一行的底边该落在哪 —— 卷纸（ridePlaten）和三维那台都读这一条 */
export const platenLine = (stage: DeskStage) => stage.bailY - BAIL_GAP;
