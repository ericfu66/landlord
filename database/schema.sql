-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  api_calls_count INTEGER DEFAULT 0,
  api_config TEXT,
  
  -- 游戏状态直接存储在用户表中
  currency INTEGER DEFAULT 1000,
  energy INTEGER DEFAULT 3,
  debt_days INTEGER DEFAULT 0,
  total_floors INTEGER DEFAULT 1,
  weather TEXT DEFAULT '晴',
  current_time TEXT DEFAULT '08:00',
  current_job TEXT,  -- JSON 格式存储
  
  -- OAuth 登录相关
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  
  -- 用户角色/化身信息（房东角色）
  avatar_name TEXT,
  avatar_age INTEGER,
  avatar_appearance TEXT,  -- 长相描述
  avatar_personality TEXT, -- 性格描述
  avatar_background TEXT,  -- 背景故事
  
  -- 新手引导状态
  needs_onboarding BOOLEAN DEFAULT TRUE,
  onboarding_step TEXT DEFAULT 'character', -- 'character' | 'apikey' | 'complete'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Discord ID 索引
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- 角色表 - 直接关联到用户
CREATE TABLE IF NOT EXISTS characters (
  name TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  template TEXT NOT NULL,
  portrait_url TEXT,
  favorability INTEGER DEFAULT 0,
  obedience INTEGER DEFAULT 0,
  corruption INTEGER DEFAULT 0,
  rent INTEGER,
  mood TEXT DEFAULT '平静',
  room_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 房间表 - 直接关联到用户
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  position_start INTEGER NOT NULL,
  position_end INTEGER NOT NULL,
  room_type TEXT NOT NULL,
  description TEXT,
  name TEXT,
  character_name TEXT,
  is_outdoor BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_name) REFERENCES characters(name) ON DELETE SET NULL
);

-- 聊天记录表
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_name) REFERENCES characters(name) ON DELETE CASCADE
);

-- 预设表
CREATE TABLE IF NOT EXISTS presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  preset_type TEXT NOT NULL,
  preset_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 世界观表
CREATE TABLE IF NOT EXISTS worldviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 角色字段更新（添加worldview_id）
-- SQLite不支持ALTER TABLE ADD FOREIGN KEY，需要手动处理
-- 注意：这条ALTER TABLE语句在应用启动时通过代码执行，此处仅作记录
-- ALTER TABLE characters ADD COLUMN worldview_id INTEGER;

-- 特殊变量字段（动态变量系统）
-- ALTER TABLE characters ADD COLUMN special_var_name TEXT;
-- ALTER TABLE characters ADD COLUMN special_var_value INTEGER DEFAULT 0;
-- ALTER TABLE characters ADD COLUMN special_var_stages TEXT; -- JSON格式存储分阶段人设

-- 创意工坊表
CREATE TABLE IF NOT EXISTS workshop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'character' | 'worldview'
  user_id INTEGER NOT NULL,
  original_id TEXT NOT NULL, -- 角色名或世界观ID
  name TEXT NOT NULL,
  description TEXT,
  data TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 角色日记表
CREATE TABLE IF NOT EXISTS character_diaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  is_peeked BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_name) REFERENCES characters(name) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 记忆摘要表
CREATE TABLE IF NOT EXISTS character_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  summary TEXT NOT NULL,
  interaction_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_name) REFERENCES characters(name) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 联机设置表
CREATE TABLE IF NOT EXISTS multiplayer_settings (
  user_id INTEGER PRIMARY KEY,
  allow_visits BOOLEAN DEFAULT TRUE,
  allow_interactions BOOLEAN DEFAULT TRUE,
  allow_character_interactions BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 联机访客记录表
CREATE TABLE IF NOT EXISTS multiplayer_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host_user_id INTEGER NOT NULL,
  visitor_user_id INTEGER NOT NULL,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (visitor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 每日新闻表
CREATE TABLE IF NOT EXISTS daily_news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- 日期 YYYY-MM-DD
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  world_news TEXT, -- 世界大事（JSON数组）
  tenant_events TEXT, -- 租客在外发生的事（JSON数组）
  weather TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 群聊消息表
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL,
  transfer_amount INTEGER,
  sticker_url TEXT,
  sticker_emotion TEXT,
  reply_to_id INTEGER,
  chain_depth INTEGER DEFAULT 0,
  is_summarized BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (save_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 群聊总结表
CREATE TABLE IF NOT EXISTS group_chat_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL,
  summary_index INTEGER NOT NULL,
  message_range TEXT NOT NULL,
  summary_content TEXT NOT NULL,
  selected BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (save_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_character ON chat_messages(character_name);
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_worldviews_user_id ON worldviews(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_type ON workshop_items(type);
CREATE INDEX IF NOT EXISTS idx_diaries_character ON character_diaries(character_name);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_save_created ON group_chat_messages(save_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_chat_summaries_save_created ON group_chat_summaries(save_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memories_character ON character_memories(character_name);
CREATE INDEX IF NOT EXISTS idx_daily_news_user_date ON daily_news(user_id, date);
