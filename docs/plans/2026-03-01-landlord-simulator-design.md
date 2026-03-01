# 房东模拟器（AI Galgame）设计文档

## 项目概述

**项目名称**: 房东模拟器（Landlord Simulator）
**技术栈**: Next.js 14 全栈 + BetterSQLite3 + Vercel AI SDK + OpenAI协议
**界面风格**: 现代 + 亚克力材质 + 动效渐变

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                     │
├─────────────────────────────────────────────────────────────┤
│  客户端                        │  服务端                     │
│  ┌─────────────────────┐       │  ┌─────────────────────┐    │
│  │ Zustand Store       │       │  │ Server Actions      │    │
│  │ - 游戏状态          │       │  │ - AI调用            │    │
│  │ - UI状态            │       │  │ - 数据持久化        │    │
│  │ - 临时交互数据      │       │  │ - 存档管理          │    │
│  └─────────────────────┘       │  └─────────────────────┘    │
│                                │                             │
│  ┌─────────────────────┐       │  ┌─────────────────────┐    │
│  │ React Components    │       │  │ BetterSQLite3      │    │
│  │ - Galgame界面       │       │  │ - 用户数据          │    │
│  │ - 基建3D视图        │       │  │ - 角色数据          │    │
│  │ - 聊天界面          │       │  │ - 房间数据          │    │
│  └─────────────────────┘       │  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**核心数据流**: 客户端发起操作 → Server Action处理 → AI API调用/数据库更新 → 返回结果 → Zustand更新 → UI响应

## 二、数据模型

### 2.1 用户表

```sql
users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',           -- admin / user
  is_banned BOOLEAN DEFAULT FALSE,
  api_calls_count INTEGER DEFAULT 0,
  api_config JSON,                    -- { baseUrl, apiKey, model }
  created_at DATETIME
)
```

### 2.2 存档表

```sql
saves (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  save_name TEXT,
  game_data JSON,
  created_at DATETIME,
  updated_at DATETIME
)
```

### 2.3 角色表

```sql
characters (
  name TEXT PRIMARY KEY,              -- 角色名即主键
  save_id INTEGER,
  template JSON,                      -- 完整角色模板JSON
  portrait_url TEXT,                  -- 立绘URL
  favorability INTEGER DEFAULT 0,     -- 好感度 -100~100
  obedience INTEGER DEFAULT 0,        -- 顺从度 -100~100
  corruption INTEGER DEFAULT 0,       -- 堕落度 -100~100
  rent INTEGER,                       -- 租金
  mood TEXT DEFAULT '平静',           -- 心情
  room_id INTEGER,
  created_at DATETIME
)
```

### 2.4 房间表

```sql
rooms (
  id INTEGER PRIMARY KEY,
  save_id INTEGER,
  floor INTEGER,
  position_start INTEGER,             -- 格子位置起始 1-10
  position_end INTEGER,               -- 格子位置结束 1-10
  room_type TEXT,                     -- 空房间/卧室/功能性房间
  description TEXT,                   -- 建造描述(用于AI判断)
  character_name TEXT,                -- 住客角色名
  is_outdoor BOOLEAN DEFAULT FALSE
)
```

### 2.5 聊天记录表

```sql
chat_messages (
  id INTEGER PRIMARY KEY,
  character_name TEXT,
  role TEXT,                          -- user / assistant
  content TEXT,
  created_at DATETIME
)
```

### 2.6 预设表

```sql
presets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  preset_type TEXT,                   -- chat/date/flirt/free
  preset_data JSON,
  created_at DATETIME
)
```

### 2.7 游戏状态表

```sql
game_states (
  id INTEGER PRIMARY KEY,
  save_id INTEGER,
  current_time DATETIME,              -- 游戏内时间
  weather TEXT,
  currency INTEGER DEFAULT 1000,
  energy INTEGER DEFAULT 3,           -- 每日体力
  debt_days INTEGER DEFAULT 0,        -- 负债天数
  total_floors INTEGER DEFAULT 1,
  current_job JSON                    -- { name, salary, daysWorked }
)
```

## 三、AI交互系统

### 3.1 API配置

- 用户自定义配置Base URL和API Key
- 自动获取可用模型列表
- 端点: `/chat/completions`

### 3.2 Function Call工具

#### 角色生成工具

```typescript
{
  name: "generate_character",
  description: "生成角色JSON模板",
  parameters: {
    type: "object",
    properties: {
      角色档案: {
        基本信息: { 姓名, 年龄, 性别, 身份, 标签 },
        外貌特征: { 整体印象, 发型, 面部, 身材, 穿着打扮 },
        性格特点: { 核心特质, 表现形式, 对用户的表现 },
        背景设定: { 家庭背景, 经济状况, 成长经历 },
        语言特征: { 音色, 说话习惯, 口头禅 },
        关系设定: { 与用户的关系, 互动方式 }
      },
      来源类型: "modern | crossover",
      穿越说明: "string (if crossover)"
    }
  }
}
```

#### 变量更新工具

```typescript
{
  name: "update_variables",
  description: "根据对话内容更新角色变量",
  parameters: {
    type: "object",
    properties: {
      character_name: "string",
      favorability_delta: "integer (-10~+10)",
      obedience_delta: "integer (-5~+5)",
      corruption_delta: "integer (-5~+5)",
      mood: "string (第一人称描述)"
    }
  }
}
```

### 3.3 预设系统

每个预设包含:
- **固定条目**(不可编辑): 人设、聊天记录、记忆
- **自定义条目**: 用户可添加，支持role和排序

四种交互模式:

| 模式 | 界面 | 预设特点 | 触发条件 |
|------|------|----------|----------|
| 日常聊天 | Galgame立绘居中 | 默认预设 | 无限制 |
| 约会 | Galgame街道背景 | 约会预设 | AI判断答应概率 |
| 调情 | 微信聊天样式 | 调情预设 | 好感度>50 |
| 自由对话 | 微信聊天样式 | 自由预设 | 无限制 |

### 3.4 变量异步更新

- 每次AI回复后异步请求变量更新
- 只发送最近3轮对话(6条消息)
- 更新期间禁用输入框

## 四、基建系统

### 4.1 房间位置系统

- 每层楼10个格子位置(1-10)
- 每格约15㎡
- 房间用"起始-结束"表示范围
- 室外区域使用"outdoor-left"/"outdoor-right"

### 4.2 建造费用

| 操作 | 费用计算 | 体力消耗 |
|------|----------|----------|
| 新建楼层 | 固定5000货币 | 1 |
| 建造房间 | 格子数 × 500 | 1 |
| 装修卧室 | 格子数 × 300 | 1 |
| 装修功能房 | 格子数 × 400 | 1 |
| 拆除房间 | 返还30%建造费 | 0 |

### 4.3 好感度增长

- 房间描述与角色性格匹配 → 每日好感+1
- 上限50

### 4.4 技术实现

- Three.js + React Three Fiber
- 等距视角相机
- 立方体表示房间

## 五、核心游戏循环

### 5.1 每日流程

1. 新的一天开始
   - 重置体力为3
   - 更新天气(随机)
   - 更新时间(游戏内)

2. 玩家行动(消耗体力)
   - 招募租客: -1体力
   - 基建建造: -1体力
   - 交互/聊天: 不消耗体力

3. 日结结算
   - 收取租金
   - 发放工资(打工中)
   - 好感度结算(房间描述匹配)

4. 货币检查
   - 负债超过7天 → 每7天随机租客离开
   - 无租客且负债>14天 → 游戏失败

### 5.2 货币平衡

- 初始货币: 1000
- 平均租金: 200-500/角色/天
- 打工收入: 100-300/天(消耗1体力)

## 六、招募系统流程

1. **选择角色类型**: 现代角色 / 跨时空角色
2. **填入期望特征**: 文字描述 + 来源选择(跨时空)
3. **AI生成角色**: Function Call生成JSON
4. **展示角色卡片**: 预览基本信息、标签、性格
5. **上传立绘**: 本地上传/URL/跳过
6. **安排房间**: 必须选择可用房间或新建
7. **完成**: 角色入住

## 七、打工系统

### 7.1 工作机制

- AI生成3个工作选项
- 选择后开始工作
- 每日结算工资，体力-1
- 可随时辞职

### 7.2 工作模板

```typescript
{
  name: "generate_jobs",
  parameters: {
    jobs: [
      { name: "工作名称", salary: 100-300, description: "描述" }
    ]
  }
}
```

## 八、存档系统

### 8.1 自动存档时机

- 每日结算后
- 招募角色后
- 建造房间后
- 完成交互后
- 用户退出游戏时

### 8.2 存档限制

- 最大存档数: 5个
- 存档包含: 游戏状态、角色、房间、聊天记录、记忆、当前工作

## 九、账号与管理系统

### 9.1 用户角色

**管理员 (admin)**:
- 用户名: ericfu, 密码: jesica16
- 查看所有用户
- 封禁/解封用户
- 查看API调用次数
- 修改游戏背景/BGM/字体CSS

**普通用户 (user)**:
- 创建/读取/删除存档
- 正常游戏功能
- 自定义预设

### 9.2 管理员面板

- 用户管理: 列表、封禁操作
- 游戏设置: 背景URL、BGM URL、字体CSS
- API统计: 总调用次数、今日调用、用户排行

## 十、UI设计规范

### 10.1 全局布局

- 全屏背景图片(现代公寓)
- 顶部透明状态栏
- 底部胶囊式导航栏
- 右下角圆形悬浮按钮(基建入口)

### 10.2 亚克力效果

```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### 10.3 动效

- Framer Motion处理过渡动画
- 按钮hover: transform + box-shadow
- 渐变色文字效果

## 十一、项目文件结构

```
landlord/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── (auth)/                   # 认证页面
│   │   ├── (game)/                   # 游戏页面
│   │   ├── admin/                    # 管理员页面
│   │   └── api/                      # API路由
│   │
│   ├── components/
│   │   ├── ui/                       # 基础UI组件
│   │   ├── game/                     # 游戏组件
│   │   └── panels/                   # 面板组件
│   │
│   ├── lib/                          # 工具库
│   │   ├── db.ts
│   │   ├── ai.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   │
│   ├── store/                        # Zustand状态
│   │   ├── gameStore.ts
│   │   ├── userStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/                        # TypeScript类型
│   │
│   └── prompts/                      # 提示词模板
│
├── public/
│   ├── images/
│   └── audio/
│
├── database/
│   └── schema.sql
│
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 十二、失败判定

- 货币为负持续7天 → 每7天随机租客离开
- 无租客且负债>14天 → 游戏失败，存档删除

## 十三、角色模板JSON结构

角色模板遵循绝对零度和白描原则，包含:
- 基本信息: 姓名、年龄、性别、身份、标签
- 外貌特征: 整体印象、发型、面部、身材、穿着打扮
- 性格特点: 核心特质(用行为展现)、表现形式、对用户的表现
- 背景设定: 家庭背景、经济状况、成长经历、社交关系
- 语言特征: 音色、说话习惯、口头禅
- 关系设定: 与用户的关系、相识过程、互动方式

描写原则:
- 不使用模糊词
- 不使用形容词堆砌
- 用行为展现性格
- 用语料展现说话方式