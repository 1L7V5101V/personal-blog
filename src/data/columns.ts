/**
 * 栏目注册表 —— 全站关于「栏目」的信息只写在这一份文件里。
 * 首页的卡片、/columns/ 索引、每个栏目页都从这里读，顺序也来自这里。
 * 加一个栏目 = 下面加一行：首页多一张卡、/columns/ 多一行、栏目页多一页。
 *
 * 栏目是「版块」，是一组文章的家；它不是文章上的标签。
 * 一篇文章属于哪个栏目，写在它 frontmatter 的 column 字段里（值是下面的 slug）。
 */

export interface Column {
  /** 路由段：/columns/{slug}/，也是文章 frontmatter 里 column 字段要填的值 */
  slug: string;
  /** 卡片上那行超大粗体字就是它，原样显示，大小写按这里写的 */
  name: string;
}

export const COLUMNS: Column[] = [
  // 旧文章（动效笔记、图形笔记、记号表、随笔）的家。它有带封面的文章，
  // 所以首页那张卡是图片卡，排在栏目卡最前面。
  { slug: 'test', name: 'Test' },
  { slug: 'leetcode', name: 'LeetCode' },
  { slug: 'pytorch', name: 'Pytorch' },
  { slug: 'nexus', name: 'Nexus' },
  { slug: 'neo', name: 'Neo' },
  { slug: 'smith', name: 'Smith' },
];

export const columnOf = (slug: string): Column | undefined =>
  COLUMNS.find((c) => c.slug === slug);
