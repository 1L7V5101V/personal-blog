/**
 * 六家综合排行那张 11 列表：从数据生成 HTML，不再是 Astro 组件。
 * 生成的是原始 HTML，直接嵌在文章的 Markdown 里（见 scripts/build-rank-table.mjs），
 * 所以这一篇也能在站上编辑 —— 排版仍然只有 src/lib/render.ts 那一份。
 */
import type { RankRow } from '../data/six-ranking';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * 每一行都受两条硬约束：六家频次之和 = 总频次；非 0 公司数 = 家数。
 * 录错一行就抛错，别放着让错数据安静上线。
 */
export function assertRankRows(rows: RankRow[]): void {
  for (const r of rows) {
    const cells = [r[3], r[4], r[5], r[6], r[7], r[8]];
    const sum = cells.reduce((s, c) => s + (c ? c[0] : 0), 0);
    const n = cells.filter((c) => c !== 0).length;
    if (sum !== r[9] || n !== r[10]) {
      throw new Error(
        `六家综合排行第 ${r[0]} 名「${r[1]}」对不上：频次和 ${sum} ≠ 总频次 ${r[9]}，或上榜数 ${n} ≠ 家数 ${r[10]}`
      );
    }
  }
}

/** 题号前缀（"146." / "剑指Offer22." / "补充题4."）单独拎出来淡一档 */
function splitTitle(t: string): [string | null, string] {
  const i = t.indexOf('. ');
  return i > 0 ? [t.slice(0, i + 1), t.slice(i + 2)] : [null, t];
}

export function rankTableHtml(cos: readonly string[], rows: RankRow[]): string {
  assertRankRows(rows);
  const head = [
    '<th class="num">排名</th>',
    '<th>题目</th>',
    '<th>Hot100</th>',
    ...cos.map((c) => `<th class="num">${esc(c)}</th>`),
    '<th class="num">总频次</th>',
    '<th class="num">家数</th>',
  ].join('');

  const body = rows
    .map((r) => {
      const cells = [r[3], r[4], r[5], r[6], r[7], r[8]];
      const [no, name] = splitTitle(r[1]);
      return [
        '<tr>',
        `<td class="num">${r[0]}</td>`,
        `<td class="ttl">${no ? `<span class="no">${esc(no)}</span>` : ''}${esc(name)}</td>`,
        `<td class="${r[2] ? 'hot' : 'hot off'}">${r[2] ? '是' : '否'}</td>`,
        ...cells.map((c) =>
          c ? `<td class="num">${c[0]}<span class="pr">(${c[1]})</span></td>` : '<td class="num off">—</td>'
        ),
        `<td class="num total">${r[9]}</td>`,
        `<td class="num">${r[10]}</td>`,
        '</tr>',
      ].join('');
    })
    .join('');

  return [
    '<div class="scroll">',
    `<table class="rank"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    '</div>',
    `<p class="fine">共 ${rows.length} 题。原表到第 70 名截断，往后的名次没有录。</p>`,
  ].join('\n');
}
