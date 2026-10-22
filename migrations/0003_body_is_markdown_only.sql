-- 正文只留 Markdown 一份（0001 那张表按 kind 存了 md 和 html 两份）。
--
-- 为什么合：文章页现在在读者浏览器里用 src/lib/render.ts 现排，存一份排好的 HTML
-- 就成了第二个出处 —— 改了 Markdown 而忘了重排，纸上和读者看到的就是两种东西。
-- 实测这一站：md 合计 52.9KB，html 合计 747.9KB（最长那篇 21.6KB 源文排成 711.3KB）。
--
-- 先把 html 那批片删掉，再把 kind 这一列整个去掉：留下来一个永远只有 'md' 的列
-- 等于把「以前有两份」这件事写在 schema 上。

DELETE FROM post_parts WHERE kind = 'html';

CREATE TABLE post_parts_new (
  slug TEXT NOT NULL,
  idx  INTEGER NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (slug, idx)
) WITHOUT ROWID;

INSERT INTO post_parts_new (slug, idx, body)
  SELECT slug, idx, body FROM post_parts;

DROP TABLE post_parts;

ALTER TABLE post_parts_new RENAME TO post_parts;
