-- 文章表。D1 是线上唯一的出处：列名就是原来 frontmatter 的字段名。
-- date / updated 用 YYYY-MM-DD 文本存，和 frontmatter 里写的一样，读出来再 new Date()。
CREATE TABLE IF NOT EXISTS posts (
  slug        TEXT PRIMARY KEY,
  column_slug TEXT NOT NULL,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  updated     TEXT,
  cover       TEXT,
  handwritten TEXT,
  depth       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  saved_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 正文（Markdown 和排好的 HTML）切片存这里。
-- 实测：D1 单个值超过约 100,000 字节直接 SQLITE_TOOBIG（98,304 过、100,352 不过）。
-- 全站最长那篇的正文 HTML 有 711,363 字节，一行塞不下，所以切成片按 idx 拼回来。
-- 片的大小由 src/lib/post-parts.ts 管，上限按 UTF-8 字节算（中文一个字三字节）。
CREATE TABLE IF NOT EXISTS post_parts (
  slug TEXT NOT NULL,
  kind TEXT NOT NULL, -- md | html
  idx  INTEGER NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (slug, kind, idx)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS posts_column ON posts(column_slug);
CREATE INDEX IF NOT EXISTS posts_updated ON posts(updated, date);
