-- 在 Supabase SQL Editor 中运行以下 SQL

CREATE TABLE IF NOT EXISTS visitors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  visit_time TEXT NOT NULL,
  device TEXT NOT NULL
);

-- 启用行级安全
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户插入
CREATE POLICY "allow_anon_insert" ON visitors FOR INSERT WITH CHECK (true);

-- 允许匿名用户查询
CREATE POLICY "allow_anon_select" ON visitors FOR SELECT USING (true);
