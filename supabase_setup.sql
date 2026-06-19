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

-- ===== 对局记录表 =====
CREATE TABLE IF NOT EXISTS game_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  game_data JSONB NOT NULL
);

ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anon_insert" ON game_records FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_anon_select" ON game_records FOR SELECT USING (true);

-- ===== 键值存储表（name_pool 等全局配置）=====
CREATE TABLE IF NOT EXISTS key_value (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE key_value ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anon_all" ON key_value FOR ALL USING (true);

-- ===== Realtime 配置（必须执行！否则跨设备同步不生效）=====
ALTER TABLE game_records REPLICA IDENTITY FULL;
ALTER TABLE key_value REPLICA IDENTITY FULL;

-- ===== 多人游戏房间表 =====
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id TEXT NOT NULL,
  game_state JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anon_all_gamesessions" ON game_sessions FOR ALL USING (true);

ALTER TABLE game_sessions REPLICA IDENTITY FULL;

-- 将表加入 realtime publication（Supabase Realtime v2）
ALTER PUBLICATION supabase_realtime ADD TABLE game_records;
ALTER PUBLICATION supabase_realtime ADD TABLE key_value;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
