# 公寓群聊 Multi-Agent 系统设计文档

## 1. 目标与范围

本阶段采用分层实现方案（方案1），优先落地“角色 Multi-Agent 群聊系统”，任务与等级系统在下一阶段单独推进并与群聊解耦。

本阶段目标：
- 新增“公寓内部群聊”系统，支持玩家主动发言触发 2-3 位租客响应
- 支持 `@角色` 强制触发，并保留额外概率触发其他租客吐槽
- 支持角色间对话链（最多 3 条回复，防止无限增殖）
- 支持角色转账（真实入账到游戏金币）
- 复用现有表情包能力，支持群聊内发送表情包
- 支持“重启对话”机制，进行分组总结并压缩上下文

非目标：
- 本阶段不实现玩家等级/公寓等级/任务系统
- 不引入实时 WebSocket 基础设施，优先使用 Vercel AI SDK 流式输出

## 2. 业务规则

### 2.1 触发机制
- 玩家发消息是唯一入口（当前版本）
- 每次发言触发来源包括：
  - `@` 角色：必定触发
  - 随机角色：从已入住租客中随机 1-2 位
  - 额外吐槽：当使用 `@` 时，概率触发 1-2 位其他租客插话

### 2.2 对话链规则
- 初始响应后允许角色互相接话
- 全链路最多 3 条角色回复（硬上限）
- 每条回复可带“触发其他角色”意图，但必须经过服务端约束判断

### 2.3 转账规则
- 货币使用游戏金币
- 角色触发转账后，服务端执行真实记账
- 转账需通过服务端校验（金额、频次、余额/上限约束）

### 2.4 表情包规则
- 复用现有表情包生成与展示能力
- 群聊消息类型支持 `sticker`

## 3. 架构与数据流

核心链路：

1. 玩家发送群聊消息
2. 服务端解析 `@`、选取随机触发角色、组装触发队列
3. 并发/分批调用角色 AI（Vercel AI SDK 流式）
4. 逐条将角色消息按时间戳推送到前端
5. 若触发对话链，继续入队直到达到 3 条上限
6. 执行工具调用（转账、表情包、触发他人）并持久化

## 4. 数据模型设计

### 4.1 群聊消息表

```sql
group_chat_messages (
  id INTEGER PRIMARY KEY,
  save_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL,          -- player / character / system
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL,         -- text / transfer / sticker / summary
  transfer_amount INTEGER,
  sticker_url TEXT,
  sticker_emotion TEXT,
  reply_to_id INTEGER,
  chain_depth INTEGER DEFAULT 0,      -- 对话链深度
  is_summarized BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.2 群聊总结表

```sql
group_chat_summaries (
  id INTEGER PRIMARY KEY,
  save_id INTEGER NOT NULL,
  summary_index INTEGER NOT NULL,
  message_range TEXT NOT NULL,        -- 例如: 1-10
  summary_content TEXT NOT NULL,
  selected BOOLEAN DEFAULT TRUE,      -- 是否注入后续系统提示词
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## 5. API 设计

### 5.1 发送消息（流式）

`POST /api/group-chat/send`

请求：

```json
{
  "content": "今晚停水",
  "mentionedCharacters": ["白领"]
}
```

响应：SSE/流式事件，包含消息增量、完整消息、工具调用结果、错误事件。

### 5.2 历史消息

`GET /api/group-chat/history?limit=50&offset=0`

### 5.3 参与者列表

`GET /api/group-chat/participants`

### 5.4 重启对话

`POST /api/group-chat/restart`

请求：

```json
{
  "keepRecentCount": 3
}
```

行为：
- 将“未总结消息”按每 10 条切组
- 每组调用 AI 生成总结
- 写入 `group_chat_summaries`
- 标记对应消息 `is_summarized = true`
- 清空活动上下文，仅保留最近 N 条用于短期连贯

### 5.5 总结管理
- `GET /api/group-chat/summaries`
- `POST /api/group-chat/select-summary`

## 6. Prompt 与工具调用策略

### 6.1 系统提示词拼接
- 角色人设
- 已选历史总结（可多条）
- 最近上下文消息（短窗口）
- 群聊行为规则（简短、口语化、可互动）

### 6.2 工具定义
- `group_chat_transfer(amount)`：角色向房东转账
- `send_sticker(emotion)`：发送表情包
- `trigger_other_character(character_name, reason)`：请求触发他人回复（服务端可拒绝）

### 6.3 有效性校验（重点）
为满足“AI 任务/结构输出必须有效”的要求，本系统对工具调用执行严格校验：
- 必须命中已注册工具名
- 参数必须通过 schema 校验
- 业务规则必须通过（例如金额、次数、链路上限）
- 未通过时降级为普通文本并记录错误日志

## 7. 上下文压缩（防爆）

### 7.1 重启对话策略
- 每 10 条消息生成 1 条结构化总结
- 每次重启新增一组总结记录（不覆盖历史）
- 玩家可选择哪些总结注入系统提示词

### 7.2 注入优先级
1. 已选总结（长期记忆）
2. 最近 N 条原始消息（短期记忆）
3. 当前玩家输入

## 8. 前端设计

新增页面入口：底部导航新增“群聊”。

页面模块：
- `GroupChatContainer`：状态与流管理
- `MessageList` / `MessageBubble`：消息渲染
- `ChatInput`：输入 + @ 选择
- `TransferModal`：转账
- `SummaryManager`：重启对话与总结选择

关键交互：
- 输入 `@` 弹出租客选择器
- 流式消息逐步显示
- 转账/表情包消息采用独立样式
- 菜单提供“重启对话”和“总结管理”

## 9. 错误处理与风控

- AI 流式失败：指数退避重试（最多 3 次）
- 单次调用超时：30 秒
- 单条玩家消息触发角色上限：5
- 对话链硬上限：3
- 消息长度限制：500 字
- 速率限制：玩家发送冷却 3 秒

## 10. 性能与可观测性

- 历史消息分页加载
- 参与者列表短缓存（5 分钟）
- 埋点：触发角色数、链路长度、工具调用成功率、平均响应时延

## 11. 测试策略

单元测试：
- 触发队列生成
- @ 必触发
- 链路上限控制
- 工具调用参数与业务校验

集成测试：
- 发送消息 -> 多角色流式回复 -> 持久化
- 转账到账
- 重启对话分组总结与选择注入

## 12. 实施阶段

### Phase 1（基础）
- 数据表与 migration
- `send/history/participants` API 骨架
- 群聊页面路由与基础 UI

### Phase 2（核心）
- 触发机制（随机 + @）
- 多角色流式回复
- 对话链与上限控制

### Phase 3（增强）
- 转账与表情包
- 观测与风控

### Phase 4（上下文）
- 重启对话
- 分组总结
- 总结选择注入

---

后续计划：完成群聊系统后，再进入“等级与任务系统”单独设计与实施，并通过事件总线与群聊系统进行轻量集成。
