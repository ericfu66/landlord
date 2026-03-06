-- 添加招募次数字段到用户表
ALTER TABLE users ADD COLUMN recruit_count INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_recruit_count ON users(recruit_count);
