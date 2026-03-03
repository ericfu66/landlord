# Landlord Game - 大型功能更新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:dispatching-parallel-agents for independent modules.

**目标:** 实现6大核心功能：自定义世界观、创意工坊、租客房间修复、联机功能、日记系统、记忆系统完善

**架构:** 使用模块化设计，每个功能独立实现。世界观和创意工坊可以并行开发，联机和日记功能依赖世界观完成，记忆系统增强现有互动功能。

**技术栈:** Next.js + TypeScript + SQL.js (本地数据库) + Zustand (状态管理) + AI API

---

## 数据库变更 (所有模块共享)

**Files:**
- Modify: `database/schema.sql`

**变更内容:**

```sql
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

-- 角色字段更新
ALTER TABLE characters ADD COLUMN worldview_id INTEGER;
ALTER TABLE characters ADD COLUMN FOREIGN KEY (worldview_id) REFERENCES worldviews(id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_worldviews_user_id ON worldviews(user_id);
CREATE INDEX IF NOT EXISTS idx_diaries_character ON character_diaries(character_name);
CREATE INDEX IF NOT EXISTS idx_memories_character ON character_memories(character_name);
CREATE INDEX IF NOT EXISTS idx_workshop_type ON workshop_items(type);
```

---

## 模块1: 自定义世界观系统

### 任务1.1: 创建世界观类型定义

**Files:**
- Create: `src/types/worldview.ts`

```typescript
export interface WorldView {
  id: number
  userId: number
  name: string
  description: string
  content: string
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

export interface WorldViewTemplate {
  name: string
  description: string
  content: string
  placeholders?: Record<string, string>
}

export interface WorldViewWithPlaceholder extends WorldView {
  placeholders: Record<string, string>
  resolvedContent: string
}

export function resolveWorldViewPlaceholders(
  content: string, 
  placeholders: Record<string, string>
): string {
  let resolved = content
  for (const [key, value] of Object.entries(placeholders)) {
    resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return resolved
}
```

**Step 1:** 创建类型定义文件

### 任务1.2: 创建世界观服务层

**Files:**
- Create: `src/lib/services/worldview-service.ts`

```typescript
import { getDb, saveDb, generateId } from '@/lib/db'
import { WorldView, WorldViewTemplate } from '@/types/worldview'
import { createChatCompletion } from '@/lib/ai/client'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getUserWorldViews(userId: number): Promise<WorldView[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, name, description, content, is_ai_generated, created_at, updated_at 
     FROM worldviews WHERE user_id = ${userId} ORDER BY created_at DESC`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    userId: row[1] as number,
    name: row[2] as string,
    description: row[3] as string,
    content: row[4] as string,
    isAiGenerated: row[5] === 1,
    createdAt: row[6] as string,
    updatedAt: row[7] as string
  }))
}

export async function getWorldViewById(id: number, userId: number): Promise<WorldView | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, name, description, content, is_ai_generated, created_at, updated_at 
     FROM worldviews WHERE id = ${id} AND user_id = ${userId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    userId: row[1] as number,
    name: row[2] as string,
    description: row[3] as string,
    content: row[4] as string,
    isAiGenerated: row[5] === 1,
    createdAt: row[6] as string,
    updatedAt: row[7] as string
  }
}

export async function createWorldView(
  userId: number,
  template: WorldViewTemplate,
  isAiGenerated: boolean = false
): Promise<WorldView> {
  const db = await getDb()
  
  const name = escapeSql(template.name)
  const description = escapeSql(template.description)
  const content = escapeSql(template.content)
  
  db.run(
    `INSERT INTO worldviews (user_id, name, description, content, is_ai_generated) 
     VALUES (${userId}, '${name}', '${description}', '${content}', ${isAiGenerated ? 1 : 0})`
  )
  
  saveDb()
  
  const result = db.exec(`SELECT id FROM worldviews WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1`)
  const id = result[0].values[0][0] as number
  
  return {
    id,
    userId,
    name: template.name,
    description: template.description,
    content: template.content,
    isAiGenerated,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export async function updateWorldView(
  id: number,
  userId: number,
  updates: Partial<WorldViewTemplate>
): Promise<WorldView | null> {
  const db = await getDb()
  
  const sets: string[] = []
  if (updates.name !== undefined) sets.push(`name = '${escapeSql(updates.name)}'`)
  if (updates.description !== undefined) sets.push(`description = '${escapeSql(updates.description)}'`)
  if (updates.content !== undefined) sets.push(`content = '${escapeSql(updates.content)}'`)
  sets.push(`updated_at = CURRENT_TIMESTAMP`)
  
  db.run(
    `UPDATE worldviews SET ${sets.join(', ')} WHERE id = ${id} AND user_id = ${userId}`
  )
  
  saveDb()
  
  return getWorldViewById(id, userId)
}

export async function deleteWorldView(id: number, userId: number): Promise<boolean> {
  const db = await getDb()
  
  // 检查是否有角色使用此世界观
  const charResult = db.exec(`SELECT COUNT(*) FROM characters WHERE worldview_id = ${id}`)
  const count = charResult[0].values[0][0] as number
  
  if (count > 0) {
    return false // 不能删除正在使用的世界观
  }
  
  db.run(`DELETE FROM worldviews WHERE id = ${id} AND user_id = ${userId}`)
  saveDb()
  
  return true
}

export async function generateWorldViewWithAI(
  userId: number,
  theme: string,
  apiConfig: any
): Promise<WorldView | null> {
  const prompt = `请基于主题"${theme}"生成一个详细的世界观设定。

要求：
1. 世界观名称（简洁有吸引力）
2. 世界观描述（100字以内）
3. 详细的世界观内容，包含以下要素：
   - 世界背景和历史
   - 地理环境和主要区域
   - 社会结构和文化习俗
   - 魔法/科技体系（如果适用）
   - 种族/势力分布
   - 独特规则和限制
   - 可用占位符：{{location}}, {{faction}}, {{era}}, {{protagonist_role}}

请以JSON格式返回：
{
  "name": "世界观名称",
  "description": "简短描述",
  "content": "详细世界观内容，可以使用{{占位符}}"
}`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }]
    })
    
    const content = response.choices[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) return null
    
    const data = JSON.parse(jsonMatch[0])
    
    return createWorldView(userId, {
      name: data.name,
      description: data.description,
      content: data.content
    }, true)
  } catch (error) {
    console.error('Generate worldview error:', error)
    return null
  }
}
```

**Step 2:** 实现服务层所有函数

### 任务1.3: 创建世界观API路由

**Files:**
- Create: `src/app/api/worldviews/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { 
  getUserWorldViews, 
  createWorldView, 
  generateWorldViewWithAI 
} from '@/lib/services/worldview-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const worldviews = await getUserWorldViews(session.userId)
    return NextResponse.json({ worldviews })
  } catch (error) {
    console.error('Get worldviews error:', error)
    return NextResponse.json({ error: '获取世界观失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, description, content, generateAI, theme } = body
    
    if (generateAI) {
      const user = await getUserById(session.userId)
      if (!user?.api_config) {
        return NextResponse.json({ error: '请先配置AI API' }, { status: 400 })
      }
      
      const apiConfig = JSON.parse(user.api_config)
      const worldview = await generateWorldViewWithAI(session.userId, theme, apiConfig)
      
      if (!worldview) {
        return NextResponse.json({ error: 'AI生成失败' }, { status: 500 })
      }
      
      return NextResponse.json({ worldview })
    }
    
    if (!name || !content) {
      return NextResponse.json({ error: '名称和内容不能为空' }, { status: 400 })
    }
    
    const worldview = await createWorldView(session.userId, {
      name,
      description: description || '',
      content
    })
    
    return NextResponse.json({ worldview })
  } catch (error) {
    console.error('Create worldview error:', error)
    return NextResponse.json({ error: '创建世界观失败' }, { status: 500 })
  }
}
```

**Files:**
- Create: `src/app/api/worldviews/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getWorldViewById, updateWorldView, deleteWorldView } from '@/lib/services/worldview-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const worldview = await getWorldViewById(parseInt(params.id), session.userId)
    if (!worldview) {
      return NextResponse.json({ error: '世界观不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ worldview })
  } catch (error) {
    console.error('Get worldview error:', error)
    return NextResponse.json({ error: '获取世界观失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const worldview = await updateWorldView(parseInt(params.id), session.userId, body)
    
    if (!worldview) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }
    
    return NextResponse.json({ worldview })
  } catch (error) {
    console.error('Update worldview error:', error)
    return NextResponse.json({ error: '更新世界观失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const success = await deleteWorldView(parseInt(params.id), session.userId)
    
    if (!success) {
      return NextResponse.json({ error: '删除失败，可能正被角色使用' }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete worldview error:', error)
    return NextResponse.json({ error: '删除世界观失败' }, { status: 500 })
  }
}
```

**Step 3:** 实现所有API端点

### 任务1.4: 创建世界观管理页面

**Files:**
- Create: `src/app/game/worldviews/page.tsx`

**Step 4:** 实现世界观列表、创建、编辑、删除UI

### 任务1.5: 集成世界观到招募系统

**Files:**
- Modify: `src/lib/services/recruit-service.ts`
  - 添加 worldviewId 参数到 createCharacter
- Modify: `src/app/api/recruit/generate/route.ts`
  - 添加世界观参数
- Modify: `src/app/game/recruit/page.tsx`
  - 添加世界观选择器

---

## 模块2: 创意工坊系统

### 任务2.1: 创建创意工坊类型定义

**Files:**
- Create: `src/types/workshop.ts`

```typescript
export type WorkshopItemType = 'character' | 'worldview'

export interface WorkshopItem {
  id: number
  type: WorkshopItemType
  userId: number
  originalId: string
  name: string
  description: string
  data: string // JSON string
  downloads: number
  rating: number
  isPublic: boolean
  createdAt: string
  authorName?: string
}

export interface WorkshopUploadRequest {
  type: WorkshopItemType
  originalId: string
  name: string
  description: string
  isPublic: boolean
}

export interface WorkshopDownloadResult {
  success: boolean
  item?: any
  error?: string
}
```

### 任务2.2: 创建创意工坊服务层

**Files:**
- Create: `src/lib/services/workshop-service.ts`

```typescript
import { getDb, saveDb } from '@/lib/db'
import { WorkshopItem, WorkshopItemType } from '@/types/workshop'
import { getCharactersByUser } from './recruit-service'
import { getUserWorldViews } from './worldview-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getPublicWorkshopItems(type?: WorkshopItemType): Promise<WorkshopItem[]> {
  const db = await getDb()
  
  let query = `
    SELECT w.id, w.type, w.user_id, w.original_id, w.name, w.description, 
           w.data, w.downloads, w.rating, w.is_public, w.created_at, u.username as author_name
    FROM workshop_items w
    JOIN users u ON w.user_id = u.id
    WHERE w.is_public = 1
  `
  
  if (type) {
    query += ` AND w.type = '${type}'`
  }
  
  query += ` ORDER BY w.downloads DESC, w.created_at DESC`
  
  const result = db.exec(query)
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    type: row[1] as WorkshopItemType,
    userId: row[2] as number,
    originalId: row[3] as string,
    name: row[4] as string,
    description: row[5] as string,
    data: row[6] as string,
    downloads: row[7] as number,
    rating: row[8] as number,
    isPublic: row[9] === 1,
    createdAt: row[10] as string,
    authorName: row[11] as string
  }))
}

export async function uploadToWorkshop(
  userId: number,
  type: WorkshopItemType,
  originalId: string,
  name: string,
  description: string,
  isPublic: boolean = true
): Promise<WorkshopItem | null> {
  const db = await getDb()
  
  // 获取原始数据
  let data: any = null
  
  if (type === 'character') {
    const chars = await getCharactersByUser(userId)
    const char = chars.find(c => c.name === originalId)
    if (!char) return null
    data = {
      template: char.template,
      portraitUrl: char.portraitUrl,
      rent: char.rent
    }
  } else if (type === 'worldview') {
    const worldviews = await getUserWorldViews(userId)
    const worldview = worldviews.find(w => w.id === parseInt(originalId))
    if (!worldview) return null
    data = {
      description: worldview.description,
      content: worldview.content,
      isAiGenerated: worldview.isAiGenerated
    }
  }
  
  if (!data) return null
  
  const nameEscaped = escapeSql(name)
  const descriptionEscaped = escapeSql(description)
  const dataJson = escapeSql(JSON.stringify(data))
  
  db.run(
    `INSERT INTO workshop_items (type, user_id, original_id, name, description, data, is_public) 
     VALUES ('${type}', ${userId}, '${escapeSql(originalId)}', '${nameEscaped}', '${descriptionEscaped}', '${dataJson}', ${isPublic ? 1 : 0})`
  )
  
  saveDb()
  
  const result = db.exec(`SELECT id FROM workshop_items WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1`)
  const id = result[0].values[0][0] as number
  
  return {
    id,
    type,
    userId,
    originalId,
    name,
    description,
    data: JSON.stringify(data),
    downloads: 0,
    rating: 0,
    isPublic,
    createdAt: new Date().toISOString()
  }
}

export async function downloadFromWorkshop(
  itemId: number,
  userId: number
): Promise<{ success: boolean; item?: any; error?: string }> {
  const db = await getDb()
  
  // 获取工坊项目
  const result = db.exec(
    `SELECT type, data FROM workshop_items WHERE id = ${itemId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return { success: false, error: '项目不存在' }
  }
  
  const type = result[0].values[0][0] as WorkshopItemType
  const data = JSON.parse(result[0].values[0][1] as string)
  
  // 增加下载计数
  db.run(`UPDATE workshop_items SET downloads = downloads + 1 WHERE id = ${itemId}`)
  saveDb()
  
  return { success: true, item: { type, data } }
}

export async function getMyUploads(userId: number): Promise<WorkshopItem[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, type, user_id, original_id, name, description, 
            data, downloads, rating, is_public, created_at
     FROM workshop_items WHERE user_id = ${userId} ORDER BY created_at DESC`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    type: row[1] as WorkshopItemType,
    userId: row[2] as number,
    originalId: row[3] as string,
    name: row[4] as string,
    description: row[5] as string,
    data: row[6] as string,
    downloads: row[7] as number,
    rating: row[8] as number,
    isPublic: row[9] === 1,
    createdAt: row[10] as string
  }))
}

export async function deleteWorkshopItem(itemId: number, userId: number): Promise<boolean> {
  const db = await getDb()
  
  db.run(`DELETE FROM workshop_items WHERE id = ${itemId} AND user_id = ${userId}`)
  saveDb()
  
  return true
}
```

### 任务2.3: 创建创意工坊API路由

**Files:**
- Create: `src/app/api/workshop/route.ts`
- Create: `src/app/api/workshop/upload/route.ts`
- Create: `src/app/api/workshop/download/route.ts`
- Create: `src/app/api/workshop/my/route.ts`

### 任务2.4: 创建创意工坊页面

**Files:**
- Create: `src/app/game/workshop/page.tsx`

**Step 5-8:** 实现工坊UI和交互

---

## 模块3: 修复租客房间问题

### 任务3.1: 分析并修复招募逻辑

**Files:**
- Modify: `src/app/api/recruit/confirm/route.ts`

```typescript
// 在确认招募时，检查是否有空房间
import { getDb } from '@/lib/db'
import { getUserById } from '@/lib/auth/repo'

async function checkAvailableRoom(userId: number): Promise<{ hasRoom: boolean; roomId?: number }> {
  const db = await getDb()
  
  // 查找空房间
  const result = db.exec(
    `SELECT id FROM rooms WHERE user_id = ${userId} AND character_name IS NULL LIMIT 1`
  )
  
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    return { hasRoom: true, roomId: result[0].values[0][0] as number }
  }
  
  return { hasRoom: false }
}

// 在招募确认API中使用
export async function POST(request: NextRequest) {
  // ... 现有代码 ...
  
  const { hasRoom, roomId } = await checkAvailableRoom(session.userId)
  
  if (!hasRoom) {
    return NextResponse.json({ error: '没有空房间！请先建造房间' }, { status: 400 })
  }
  
  // 创建角色并分配到房间
  const character = await createCharacter(session.userId, template, roomId)
  // ...
}
```

### 任务3.2: 更新招募页面提示

**Files:**
- Modify: `src/app/game/recruit/page.tsx`
  - 在招募按钮旁显示当前空房间数量
  - 如果没有空房间，禁用招募按钮并提示用户先建造房间

---

## 模块4: 联机功能

### 任务4.1: 创建联机类型定义

**Files:**
- Create: `src/types/multiplayer.ts`

```typescript
export interface MultiplayerSettings {
  userId: number
  allowVisits: boolean
  allowInteractions: boolean
  allowCharacterInteractions: boolean
}

export interface VisitRecord {
  id: number
  hostUserId: number
  visitorUserId: number
  visitedAt: string
  visitorName?: string
}

export interface VisitableUser {
  userId: number
  username: string
  totalFloors: number
  characterCount: number
  allowVisits: boolean
}

export interface RemoteBuilding {
  floors: Array<{
    floor: number
    rooms: Array<{
      id: number
      roomType: string
      name: string
      description: string
      characterName?: string
      characterPortrait?: string
    }>
  }>
}

export interface RemoteCharacter {
  name: string
  template: any
  portraitUrl?: string
  mood: string
  favorability: number
  // 不包含敏感变量（顺从度、堕落度）
}
```

### 任务4.2: 创建联机服务层

**Files:**
- Create: `src/lib/services/multiplayer-service.ts`

```typescript
import { getDb, saveDb } from '@/lib/db'
import { MultiplayerSettings, VisitRecord, VisitableUser, RemoteBuilding, RemoteCharacter } from '@/types/multiplayer'
import { getCharactersByUser } from './recruit-service'
import { getUserRooms } from './building-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getMultiplayerSettings(userId: number): Promise<MultiplayerSettings> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT user_id, allow_visits, allow_interactions, allow_character_interactions 
     FROM multiplayer_settings WHERE user_id = ${userId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    // 创建默认设置
    db.run(
      `INSERT INTO multiplayer_settings (user_id, allow_visits, allow_interactions, allow_character_interactions) 
       VALUES (${userId}, 1, 1, 1)`
    )
    saveDb()
    
    return {
      userId,
      allowVisits: true,
      allowInteractions: true,
      allowCharacterInteractions: true
    }
  }
  
  const row = result[0].values[0]
  return {
    userId: row[0] as number,
    allowVisits: row[1] === 1,
    allowInteractions: row[2] === 1,
    allowCharacterInteractions: row[3] === 1
  }
}

export async function updateMultiplayerSettings(
  userId: number,
  settings: Partial<MultiplayerSettings>
): Promise<MultiplayerSettings> {
  const db = await getDb()
  
  const sets: string[] = []
  if (settings.allowVisits !== undefined) sets.push(`allow_visits = ${settings.allowVisits ? 1 : 0}`)
  if (settings.allowInteractions !== undefined) sets.push(`allow_interactions = ${settings.allowInteractions ? 1 : 0}`)
  if (settings.allowCharacterInteractions !== undefined) sets.push(`allow_character_interactions = ${settings.allowCharacterInteractions ? 1 : 0}`)
  
  if (sets.length > 0) {
    db.run(`UPDATE multiplayer_settings SET ${sets.join(', ')} WHERE user_id = ${userId}`)
    saveDb()
  }
  
  return getMultiplayerSettings(userId)
}

export async function getVisitableUsers(): Promise<VisitableUser[]> {
  const db = await getDb()
  
  const result = db.exec(`
    SELECT u.id, u.username, u.total_floors, 
           (SELECT COUNT(*) FROM characters c WHERE c.user_id = u.id) as character_count,
           COALESCE(ms.allow_visits, 1) as allow_visits
    FROM users u
    LEFT JOIN multiplayer_settings ms ON u.id = ms.user_id
    WHERE COALESCE(ms.allow_visits, 1) = 1
    ORDER BY u.total_floors DESC
    LIMIT 50
  `)
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    userId: row[0] as number,
    username: row[1] as string,
    totalFloors: row[2] as number,
    characterCount: row[3] as number,
    allowVisits: row[4] === 1
  }))
}

export async function getRemoteBuilding(userId: number): Promise<RemoteBuilding | null> {
  const db = await getDb()
  
  // 检查是否允许访问
  const settings = await getMultiplayerSettings(userId)
  if (!settings.allowVisits) {
    return null
  }
  
  const rooms = await getUserRooms(userId)
  
  // 按楼层分组
  const floors: RemoteBuilding['floors'] = []
  const floorMap = new Map<number, typeof floors[0]>()
  
  for (const room of rooms) {
    if (!floorMap.has(room.floor)) {
      floorMap.set(room.floor, {
        floor: room.floor,
        rooms: []
      })
      floors.push(floorMap.get(room.floor)!)
    }
    
    const roomData: any = {
      id: room.id,
      roomType: room.roomType,
      name: room.name,
      description: room.description
    }
    
    if (room.characterName) {
      roomData.characterName = room.characterName
      // 获取角色头像
      const charResult = db.exec(
        `SELECT portrait_url FROM characters WHERE name = '${escapeSql(room.characterName)}'`
      )
      if (charResult && charResult.length > 0 && charResult[0].values) {
        roomData.characterPortrait = charResult[0].values[0][0] as string
      }
    }
    
    floorMap.get(room.floor)!.rooms.push(roomData)
  }
  
  return { floors }
}

export async function getRemoteCharacters(userId: number): Promise<RemoteCharacter[]> {
  const db = await getDb()
  
  // 检查是否允许角色互动
  const settings = await getMultiplayerSettings(userId)
  if (!settings.allowCharacterInteractions) {
    return []
  }
  
  const characters = await getCharactersByUser(userId)
  
  return characters.map(char => ({
    name: char.name,
    template: char.template,
    portraitUrl: char.portraitUrl,
    mood: char.mood,
    favorability: char.favorability
    // 注意：不返回顺从度、堕落度等敏感信息
  }))
}

export async function recordVisit(hostUserId: number, visitorUserId: number): Promise<void> {
  const db = await getDb()
  
  db.run(
    `INSERT INTO multiplayer_visits (host_user_id, visitor_user_id) VALUES (${hostUserId}, ${visitorUserId})`
  )
  saveDb()
}

export async function getVisitHistory(userId: number): Promise<VisitRecord[]> {
  const db = await getDb()
  
  const result = db.exec(`
    SELECT v.id, v.host_user_id, v.visitor_user_id, v.visited_at, u.username as visitor_name
    FROM multiplayer_visits v
    JOIN users u ON v.visitor_user_id = u.id
    WHERE v.host_user_id = ${userId}
    ORDER BY v.visited_at DESC
    LIMIT 20
  `)
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    hostUserId: row[1] as number,
    visitorUserId: row[2] as number,
    visitedAt: row[3] as string,
    visitorName: row[4] as string
  }))
}
```

### 任务4.3: 创建联机API路由

**Files:**
- Create: `src/app/api/multiplayer/settings/route.ts`
- Create: `src/app/api/multiplayer/users/route.ts`
- Create: `src/app/api/multiplayer/visit/[userId]/route.ts`

### 任务4.4: 创建访客互动API

**Files:**
- Create: `src/app/api/multiplayer/interact/route.ts`

```typescript
// 访客与角色互动的简化版本，不修改实际变量
// 仅用于展示和简单对话
```

### 任务4.5: 创建联机页面

**Files:**
- Create: `src/app/game/multiplayer/page.tsx`
- Create: `src/app/game/multiplayer/visit/[userId]/page.tsx`

---

## 模块5: 日记功能

### 任务5.1: 创建日记类型定义

**Files:**
- Create: `src/types/diary.ts`

```typescript
export interface DiaryEntry {
  id: number
  characterName: string
  userId: number
  date: string
  content: string
  mood: string
  isPeeked: boolean
  createdAt: string
}

export interface DiaryRequest {
  type: 'ask' | 'peek'
  characterName: string
  date?: string // 如果不指定则生成当天的
}
```

### 任务5.2: 创建日记服务层

**Files:**
- Create: `src/lib/services/diary-service.ts`

```typescript
import { getDb, saveDb } from '@/lib/db'
import { DiaryEntry } from '@/types/diary'
import { createChatCompletion } from '@/lib/ai/client'
import { getCharacterData } from './recruit-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getCharacterDiaries(
  characterName: string, 
  userId: number,
  limit: number = 10
): Promise<DiaryEntry[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, character_name, user_id, date, content, mood, is_peeked, created_at 
     FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY date DESC, created_at DESC
     LIMIT ${limit}`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    date: row[3] as string,
    content: row[4] as string,
    mood: row[5] as string,
    isPeeked: row[6] === 1,
    createdAt: row[7] as string
  }))
}

export async function createDiaryEntry(
  characterName: string,
  userId: number,
  content: string,
  mood: string,
  date: string,
  isPeeked: boolean = false
): Promise<DiaryEntry> {
  const db = await getDb()
  
  const contentEscaped = escapeSql(content)
  const moodEscaped = escapeSql(mood)
  const dateEscaped = escapeSql(date)
  
  db.run(
    `INSERT INTO character_diaries (character_name, user_id, date, content, mood, is_peeked) 
     VALUES ('${escapeSql(characterName)}', ${userId}, '${dateEscaped}', '${contentEscaped}', '${moodEscaped}', ${isPeeked ? 1 : 0})`
  )
  
  saveDb()
  
  const result = db.exec(
    `SELECT id FROM character_diaries WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} ORDER BY id DESC LIMIT 1`
  )
  const id = result[0].values[0][0] as number
  
  return {
    id,
    characterName,
    userId,
    date,
    content,
    mood,
    isPeeked,
    createdAt: new Date().toISOString()
  }
}

export async function generateDiaryWithAI(
  characterName: string,
  userId: number,
  apiConfig: any,
  date: string,
  isPeeked: boolean = false
): Promise<DiaryEntry | null> {
  const character = await getCharacterData(characterName, userId)
  if (!character) return null
  
  // 获取最近的聊天记录作为上下文
  const db = await getDb()
  const chatResult = db.exec(
    `SELECT content FROM chat_messages 
     WHERE character_name = '${escapeSql(characterName)}' 
     ORDER BY created_at DESC LIMIT 5`
  )
  
  const recentChats = chatResult && chatResult.length > 0 && chatResult[0].values
    ? chatResult[0].values.map((row: unknown[]) => row[0] as string).reverse()
    : []
  
  const prompt = `作为${character.template.角色档案.基本信息.姓名}，请写一篇${date}的日记。

角色设定：
${JSON.stringify(character.template, null, 2)}

当前状态：
- 好感度：${character.favorability}
- 顺从度：${character.obedience}
- 心情：${character.mood}

${recentChats.length > 0 ? `最近与房东的互动：\n${recentChats.join('\n')}` : '最近没有特别的互动。'}

${isPeeked ? '注意：这是被偷看的日记，角色并不知道房东会读到。' : '注意：这是向房东展示的日记。'}

请以第一人称写一篇日记，包含：
1. 当天的心情（用一个词描述）
2. 日记内容（200-400字，描述当天的感受、想法、对房东的看法等）

请以JSON格式返回：
{
  "mood": "心情词",
  "content": "日记内容"
}`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }]
    })
    
    const content = response.choices[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) return null
    
    const data = JSON.parse(jsonMatch[0])
    
    return createDiaryEntry(characterName, userId, data.content, data.mood, date, isPeeked)
  } catch (error) {
    console.error('Generate diary error:', error)
    return null
  }
}

export async function deleteOldestDiaries(characterName: string, userId: number, keepCount: number = 5): Promise<void> {
  const db = await getDb()
  
  db.run(`
    DELETE FROM character_diaries 
    WHERE id IN (
      SELECT id FROM character_diaries 
      WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT -1 OFFSET ${keepCount}
    )
  `)
  
  saveDb()
}
```

### 任务5.3: 创建日记API路由

**Files:**
- Create: `src/app/api/diary/route.ts`
- Create: `src/app/api/diary/generate/route.ts`

### 任务5.4: 集成日记到记忆系统

在记忆服务中添加日记相关的记忆：
- 获取最近5篇日记作为记忆的一部分

---

## 模块6: 记忆系统完善

### 任务6.1: 增强记忆服务层

**Files:**
- Create: `src/lib/services/memory-service.ts`

```typescript
import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { getCharactersByUser } from './recruit-service'
import { getCharacterDiaries } from './diary-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export interface CharacterMemory {
  id: number
  characterName: string
  userId: number
  summary: string
  interactionDate: string
  createdAt: string
}

export interface EnhancedMemoryContext {
  selfSummary: string // 关于自己的记忆摘要
  cohabitantsInfo: string // 同租者信息
  recentDiaries: string // 最近日记
  relationshipWithUser: string // 与user的关系
}

export async function getCharacterMemories(
  characterName: string,
  userId: number,
  limit: number = 10
): Promise<CharacterMemory[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, character_name, user_id, summary, interaction_date, created_at 
     FROM character_memories 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY interaction_date DESC
     LIMIT ${limit}`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    summary: row[3] as string,
    interactionDate: row[4] as string,
    createdAt: row[5] as string
  }))
}

export async function saveMemorySummary(
  characterName: string,
  userId: number,
  summary: string,
  interactionDate: string
): Promise<CharacterMemory> {
  const db = await getDb()
  
  const summaryEscaped = escapeSql(summary)
  const dateEscaped = escapeSql(interactionDate)
  
  db.run(
    `INSERT INTO character_memories (character_name, user_id, summary, interaction_date) 
     VALUES ('${escapeSql(characterName)}', ${userId}, '${summaryEscaped}', '${dateEscaped}')`
  )
  
  saveDb()
  
  const result = db.exec(
    `SELECT id FROM character_memories WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} ORDER BY id DESC LIMIT 1`
  )
  const id = result[0].values[0][0] as number
  
  return {
    id,
    characterName,
    userId,
    summary,
    interactionDate,
    createdAt: new Date().toISOString()
  }
}

export async function generateMemorySummary(
  characterName: string,
  userId: number,
  chatHistory: string,
  apiConfig: any
): Promise<string | null> {
  const prompt = `请总结以下对话内容，提取关键信息作为角色的记忆：

对话记录：
${chatHistory}

请总结：
1. 本次互动的核心内容
2. 用户的意图或需求
3. 角色的回应和态度
4. 任何重要的决定或承诺
5. 关系的变化

请用简洁的一段话（100字以内）总结。`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }]
    })
    
    return response.choices[0]?.message?.content || null
  } catch (error) {
    console.error('Generate memory summary error:', error)
    return null
  }
}

export async function getEnhancedMemoryContext(
  characterName: string,
  userId: number
): Promise<EnhancedMemoryContext> {
  const db = await getDb()
  
  // 1. 获取自己的记忆摘要
  const memories = await getCharacterMemories(characterName, userId, 5)
  const selfSummary = memories.map(m => `[${m.interactionDate}] ${m.summary}`).join('\n') || '暂无记忆'
  
  // 2. 获取同租者信息
  const allCharacters = await getCharactersByUser(userId)
  const currentChar = allCharacters.find(c => c.name === characterName)
  const cohabitants = allCharacters.filter(c => c.name !== characterName)
  
  const cohabitantsInfo = cohabitants.length > 0
    ? cohabitants.map(c => `- ${c.name}：${c.template.角色档案.基本信息.身份}，好感度${c.favorability}，当前心情${c.mood}`).join('\n')
    : '暂无同租者'
  
  // 3. 获取最近日记
  const diaries = await getCharacterDiaries(characterName, userId, 5)
  const recentDiaries = diaries.map(d => `[${d.date}] 心情：${d.mood}\n${d.content}`).join('\n\n') || '暂无日记'
  
  // 4. 与user的关系
  const relationshipWithUser = currentChar
    ? `与房东的关系：${currentChar.template.角色档案.关系设定.与用户的关系}。相识过程：${currentChar.template.角色档案.关系设定.相识过程}。当前好感度：${currentChar.favorability}。`
    : '关系未知'
  
  return {
    selfSummary,
    cohabitantsInfo,
    recentDiaries,
    relationshipWithUser
  }
}

export async function autoSummarizeInteraction(
  characterName: string,
  userId: number,
  userInput: string,
  assistantReply: string,
  apiConfig: any
): Promise<void> {
  const chatHistory = `用户：${userInput}\n角色：${assistantReply}`
  const summary = await generateMemorySummary(characterName, userId, chatHistory, apiConfig)
  
  if (summary) {
    const today = new Date().toISOString().split('T')[0]
    await saveMemorySummary(characterName, userId, summary, today)
  }
}
```

### 任务6.2: 修改聊天API集成记忆

**Files:**
- Modify: `src/app/api/interact/chat/route.ts`

```typescript
// 在composeMessages之前，获取增强记忆上下文
import { getEnhancedMemoryContext, autoSummarizeInteraction } from '@/lib/services/memory-service'

// 在原有代码基础上，修改记忆部分：
const enhancedMemory = await getEnhancedMemoryContext(characterName, session.userId)

const memoryContent = `好感度: ${characterData.favorability}, 顺从度: ${characterData.obedience}, 心情: ${characterData.mood}

【关于自己的记忆】
${enhancedMemory.selfSummary}

【同租者信息】
${enhancedMemory.cohabitantsInfo}

【最近的日记】
${enhancedMemory.recentDiaries}

【与房东的关系】
${enhancedMemory.relationshipWithUser}`

// 在保存消息后，自动总结
await autoSummarizeInteraction(
  characterName, 
  session.userId, 
  userInput, 
  reply, 
  config
)
```

### 任务6.3: 更新Preset组装逻辑

**Files:**
- Modify: `src/lib/services/preset-service.ts`

在composeMessages中添加世界观注入：

```typescript
export function composeMessages(
  config: PresetConfig, 
  worldviewContent?: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = []

  // 如果有世界观，先注入世界观
  if (worldviewContent) {
    messages.push({ 
      role: 'system', 
      content: `【世界观背景】\n${worldviewContent}\n\n请在此世界观背景下进行角色扮演。` 
    })
  }

  messages.push({ role: 'system', content: config.fixed.persona })
  messages.push({ role: 'system', content: `记忆：\n${config.fixed.memory}` })
  messages.push({ role: 'system', content: `聊天记录：\n${config.fixed.history}` })

  const sortedCustom = [...config.custom].sort((a, b) => a.order - b.order)
  for (const entry of sortedCustom) {
    messages.push({ role: entry.role, content: entry.content })
  }

  messages.push({ role: 'user', content: config.userInput })

  return messages
}
```

---

## 测试策略

### 单元测试

**Files:**
- Create: `tests/worldview/worldview-service.test.ts`
- Create: `tests/workshop/workshop-service.test.ts`
- Create: `tests/diary/diary-service.test.ts`
- Create: `tests/memory/memory-service.test.ts`

### E2E测试

**Files:**
- Create: `tests/e2e/worldview-flow.spec.ts`
- Create: `tests/e2e/workshop-flow.spec.ts`
- Create: `tests/e2e/multiplayer-flow.spec.ts`

---

## 执行策略

### 独立模块 (可并行)
1. 模块1: 自定义世界观系统
2. 模块2: 创意工坊系统
3. 模块3: 租客房间修复

### 依赖模块 (需按序)
4. 模块5: 日记功能 (依赖世界观)
5. 模块6: 记忆系统完善 (依赖日记)
6. 模块4: 联机功能 (依赖其他所有)

### 执行顺序

**阶段1 (并行):**
- Task 1.1-1.3: 世界观类型、服务、API
- Task 2.1-2.3: 工坊类型、服务、API
- Task 3.1-3.2: 房间修复

**阶段2:**
- Task 1.4-1.5: 世界观UI和招募集成
- Task 2.4: 工坊UI

**阶段3:**
- Task 5.1-5.4: 日记系统

**阶段4:**
- Task 6.1-6.3: 记忆系统

**阶段5:**
- Task 4.1-4.5: 联机功能

---

## 数据库迁移检查清单

- [ ]  worldview表
- [ ]  character_diaries表
- [ ]  character_memories表
- [ ]  workshop_items表
- [ ]  multiplayer_settings表
- [ ]  multiplayer_visits表
- [ ]  characters表添加worldview_id字段

**迁移命令:**
```bash
# 开发环境自动迁移
npm run dev

# 手动迁移
npm run db:migrate
```

---

**计划完成时间预估:** 8-12小时
**推荐执行方式:** 使用dispatching-parallel-agents并行执行独立模块
