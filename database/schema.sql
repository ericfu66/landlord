CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  api_calls_count INTEGER DEFAULT 0,
  api_config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  save_name TEXT NOT NULL,
  game_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS characters (
  name TEXT PRIMARY KEY,
  save_id INTEGER,
  template TEXT NOT NULL,
  portrait_url TEXT,
  favorability INTEGER DEFAULT 0,
  obedience INTEGER DEFAULT 0,
  corruption INTEGER DEFAULT 0,
  rent INTEGER,
  mood TEXT DEFAULT '平静',
  room_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  position_start INTEGER NOT NULL,
  position_end INTEGER NOT NULL,
  room_type TEXT NOT NULL,
  description TEXT,
  character_name TEXT,
  is_outdoor BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
  FOREIGN KEY (character_name) REFERENCES characters(name) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_name) REFERENCES characters(name) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  preset_type TEXT NOT NULL,
  preset_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL UNIQUE,
  current_time TEXT,
  weather TEXT,
  currency INTEGER DEFAULT 1000,
  energy INTEGER DEFAULT 3,
  debt_days INTEGER DEFAULT 0,
  total_floors INTEGER DEFAULT 1,
  current_job TEXT,
  FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_save_id ON characters(save_id);
CREATE INDEX IF NOT EXISTS idx_rooms_save_id ON rooms(save_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_character ON chat_messages(character_name);
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);