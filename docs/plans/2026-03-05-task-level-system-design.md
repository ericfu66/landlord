# 任务与等级系统设计

## 概述

AI驱动的任务系统 + 等级天赋树。每日推进时AI根据玩家状态生成任务，完成任务获得金币和经验，经验升级后获得天赋点，用于三条天赋路线的加点。

## 1. AI任务生成

### 上下文构建

`buildTaskContext(userId)` 函数查询并拼接紧凑状态摘要（约200-500 tokens）：

1. 玩家基础状态（1行）：等级、金币、能量、楼层、天数、天气
2. 角色列表（每角色1行，最多10个）：好感、服从、黑化、特殊变量、住房
3. 建筑概况（1行）：楼层数、各类房间数量
4. 当前工作（1行）
5. 已有活跃任务（避免重复生成）

### 生成时机

每日推进（`/api/game/advance`）时：
1. 将前一天未完成任务标记 `expired`
2. 调用AI生成2-3个新任务
3. 与新闻生成并行或顺序执行

### AI Tool定义

```typescript
{
  type: 'function',
  function: {
    name: 'generate_tasks',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              condition_type: { type: 'string', enum: [
                'interact', 'collect_rent', 'recruit', 'build_room',
                'reach_favorability', 'spend_currency', 'work_days', 'group_chat'
              ]},
              condition_target: { type: 'string', nullable: true },
              condition_count: { type: 'number' },
              gold_reward: { type: 'number' },
              xp_reward: { type: 'number' }
            },
            required: ['title', 'description', 'condition_type', 'condition_count', 'gold_reward', 'xp_reward']
          }
        }
      },
      required: ['tasks']
    }
  }
}
```

## 2. 任务数据模型

### 数据库表

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_target TEXT,
  condition_count INTEGER NOT NULL DEFAULT 1,
  condition_progress INTEGER NOT NULL DEFAULT 0,
  gold_reward INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active / completed / expired
  created_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 条件类型（8种）

| type | target | 含义 |
|------|--------|------|
| `interact` | 角色名 or null | 与指定/任意角色互动N次 |
| `collect_rent` | null | 收取N金币租金 |
| `recruit` | null | 招募N个角色 |
| `build_room` | 房间类型 or null | 建造N间房间 |
| `reach_favorability` | 角色名 | 某角色好感度达到N |
| `spend_currency` | null | 消费N金币 |
| `work_days` | null | 工作N天 |
| `group_chat` | null | 群聊发送N条消息 |

### 进度追踪

在现有API关键位置插入 `updateTaskProgress(userId, conditionType, target)` 调用：

- `/api/interact/chat` → `updateTaskProgress(userId, 'interact', characterName)`
- `/api/game/advance` 租金结算 → `updateTaskProgress(userId, 'collect_rent', null, rentAmount)`
- `/api/recruit/generate-batch` → `updateTaskProgress(userId, 'recruit')`
- `/api/building/` 建造 → `updateTaskProgress(userId, 'build_room', roomType)`
- `/api/group-chat/send` → `updateTaskProgress(userId, 'group_chat')`
- `/api/jobs/` 工作 → `updateTaskProgress(userId, 'work_days')`
- 消费金币时 → `updateTaskProgress(userId, 'spend_currency', null, amount)`
- 好感变化时 → 检查 `reach_favorability` 类任务

当 `progress >= count` 时自动完成，发放金币和经验奖励。

## 3. 等级系统

### 用户表新增字段

```sql
ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN talent_points INTEGER NOT NULL DEFAULT 0;
```

### 升级公式

最高20级，升级所需经验 = `level * 100`。

| 等级 | 升级所需 | 累计总经验 |
|------|---------|-----------|
| 1→2 | 100 | 100 |
| 2→3 | 200 | 300 |
| 5→6 | 500 | 1500 |
| 10→11 | 1000 | 5500 |
| 19→20 | 1900 | 19000 |

每次升级获得1个天赋点，满级共19个天赋点。

### 升级逻辑

任务完成时调用 `addXp(userId, amount)`：
- 循环检查 xp >= level * 100 且 level < 20
- 溢出经验进入下一级
- 每升一级 talentPoints++

## 4. 天赋树系统

### 三条路线，每条5个天赋，分3层

需要在前一层至少点1个天赋才能解锁下一层。

#### 魅力系（Charisma）

| 层级 | 天赋ID | 名称 | 最大等级 | 效果 |
|------|--------|------|---------|------|
| 1 | charisma_sweet_talk | 甜言蜜语 | 3 | 好感度变化量 * (1 + 0.1*lv) |
| 1 | charisma_affinity | 亲和力 | 3 | 招募时初始好感 +5/+10/+15 |
| 2 | charisma_eloquence | 能说会道 | 3 | 说服相关好感增量额外 * (1 + 0.1*lv) |
| 2 | charisma_aura | 魅力光环 | 2 | 所有角色每日好感自然回升 +1/+2 |
| 3 | charisma_idol | 万人迷 | 1 | 互动模式解锁门槛降低20（date 30→10, flirt 50→30） |

#### 暗影系（Shadow）

| 层级 | 天赋ID | 名称 | 最大等级 | 效果 |
|------|--------|------|---------|------|
| 1 | shadow_intimidate | 威压 | 3 | 服从度变化量 * (1 + 0.1*lv) |
| 1 | shadow_hint | 暗示 | 3 | 黑化值变化量 * (1 + 0.1*lv) |
| 2 | shadow_manipulate | 操纵术 | 3 | 特殊变量变化量 * (1 + 0.1*lv) |
| 2 | shadow_fear | 恐惧支配 | 2 | 服从度>50的角色租金 * (1 + 0.1*lv) |
| 3 | shadow_abyss | 堕落深渊 | 1 | 黑化>70的角色标记 hidden_plot_unlocked |

#### 经营系（Business）

| 层级 | 天赋ID | 名称 | 最大等级 | 效果 |
|------|--------|------|---------|------|
| 1 | business_merchant | 精明商人 | 3 | 租金收入 * (1 + 0.05*lv) |
| 1 | business_discount | 工程折扣 | 3 | 建造费用 * (1 - 0.05*lv) |
| 2 | business_energy | 精力充沛 | 2 | 每日能量上限 +1/+2 |
| 2 | business_hunter | 高薪猎手 | 3 | 工作日薪 * (1 + 0.1*lv) |
| 3 | business_tycoon | 地产大亨 | 1 | 新楼层价格 * 0.8 |

### 天赋数据库表

```sql
CREATE TABLE talents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  talent_id TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, talent_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 天赋效果实现（全部硬编码）

所有天赋效果通过代码数值计算，不依赖AI提示词：

- **甜言蜜语/威压/暗示/操纵术**：在 variables-service 中对AI返回的变化量应用乘数
- **亲和力**：招募时设置初始好感 = 0 + 5 * level
- **魅力光环**：dailyReset 中遍历角色，好感 += level
- **能说会道**：好感增量额外乘数，与甜言蜜语叠加
- **万人迷**：互动模式解锁门槛常量减20
- **恐惧支配**：租金计算时检测服从度>50则应用乘数
- **堕落深渊**：黑化>70时标记角色 hidden_plot_unlocked
- **精明商人**：economy-service 租金结算乘数
- **工程折扣**：building-service 建造费用乘数
- **精力充沛**：dailyReset 能量上限 = 3 + level
- **高薪猎手**：工资结算乘数
- **地产大亨**：新楼层价格 * 0.8

### 退点机制

花费金币逐个退点，费用 = 200 * 当前天赋等级。退还1个天赋点。

### 点数分析

全满需41点，满级仅19点，玩家必须做取舍。

## 5. UI

### 新增页面

1. **`/game/tasks`** — 任务面板
   - 当日活跃任务（2-3个），带进度条
   - 已完成任务高亮显示奖励
   - 底部等级进度条（当前经验/升级所需）

2. **`/game/talents`** — 天赋树页面
   - 三列布局，每列一条路线
   - 天赋节点显示当前等级/最大等级，可点击加点
   - 顶部显示可用天赋点数
   - 长按/右键退点确认（显示费用）

### 导航入口

在游戏主界面添加"任务"和"天赋"按钮，与现有功能并列。

### advance API响应扩展

返回中新增 `tasks` 和 `levelInfo` 字段。

## 6. API端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/tasks` | GET | 获取当日任务列表 |
| `/api/tasks/generate` | POST | 生成每日任务（advance调用） |
| `/api/tasks/progress` | POST | 更新任务进度（内部调用） |
| `/api/talents` | GET | 获取天赋树状态 |
| `/api/talents/allocate` | POST | 加点 |
| `/api/talents/refund` | POST | 退点 |
| `/api/level` | GET | 获取等级信息 |
