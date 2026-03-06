# Group Chat Multi-Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready apartment group chat system with multi-character streaming replies, `@` triggers, capped dialogue chaining, real coin transfer, sticker support, and restart-with-summary context compression.

**Architecture:** Add new group-chat domain tables, types, service layer, API routes, and a dedicated `/game/group-chat` page. The server orchestrates trigger selection and constrained chain replies while validating all tool calls. Context compression is implemented by batching unsummarized messages into groups of 10, summarizing with AI, and injecting selected summaries into future system prompts.

**Tech Stack:** Next.js 14 App Router, TypeScript, sql.js, Vercel AI SDK (`ai`), Vitest, existing auth/session + AI client utilities.

---

### Task 1: Add database schema for group chat and summaries

**Files:**
- Modify: `database/schema.sql`
- Test: `tests/db/schema.test.ts`

**Step 1: Write the failing test**

```ts
it('creates group chat tables and indexes', async () => {
  const db = await getDb()
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('group_chat_messages','group_chat_summaries')")
  expect(tables[0]?.values?.length).toBe(2)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/db/schema.test.ts`
Expected: FAIL because tables are missing.

**Step 3: Write minimal implementation**

Add SQL blocks:

```sql
CREATE TABLE IF NOT EXISTS group_chat_messages (...);
CREATE TABLE IF NOT EXISTS group_chat_summaries (...);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_save_created ON group_chat_messages(save_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_chat_summaries_save_created ON group_chat_summaries(save_id, created_at);
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/db/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add database/schema.sql tests/db/schema.test.ts
git commit -m "feat: add schema for group chat messages and summaries"
```

### Task 2: Add domain types for group chat

**Files:**
- Create: `src/types/group-chat.ts`
- Test: `tests/group-chat/types.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type { GroupChatMessage, GroupChatSummary } from '@/types/group-chat'

describe('group chat types', () => {
  it('has strict message type union', () => {
    expectTypeOf<GroupChatMessage['messageType']>().toEqualTypeOf<'text' | 'transfer' | 'sticker' | 'summary'>()
  })
  it('has summary selection field', () => {
    expectTypeOf<GroupChatSummary['selected']>().toEqualTypeOf<boolean>()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/types.test.ts`
Expected: FAIL because module does not exist.

**Step 3: Write minimal implementation**

```ts
export type GroupChatMessageType = 'text' | 'transfer' | 'sticker' | 'summary'
export interface GroupChatMessage { ... }
export interface GroupChatSummary { ... }
export interface SendGroupChatRequest { ... }
export interface RestartGroupChatRequest { ... }
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/group-chat/types.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/group-chat.ts tests/group-chat/types.test.ts
git commit -m "feat: add group chat domain types"
```

### Task 3: Implement persistence service for messages and summaries

**Files:**
- Create: `src/lib/services/group-chat-service.ts`
- Test: `tests/group-chat/group-chat-service.test.ts`

**Step 1: Write the failing test**

```ts
it('saves and fetches messages by save_id desc', async () => {
  await saveGroupChatMessage({ saveId: 1, senderType: 'player', senderName: '房东', content: '今晚停水', messageType: 'text' })
  const list = await getGroupChatHistory(1, 50, 0)
  expect(list.length).toBeGreaterThan(0)
  expect(list[0].content).toBe('今晚停水')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/group-chat-service.test.ts`
Expected: FAIL because functions are missing.

**Step 3: Write minimal implementation**

Implement:

```ts
export async function saveGroupChatMessage(input: SaveGroupChatMessageInput): Promise<GroupChatMessage>
export async function getGroupChatHistory(saveId: number, limit: number, offset: number): Promise<GroupChatMessage[]>
export async function getUnsummarizedMessages(saveId: number): Promise<GroupChatMessage[]>
export async function saveGroupChatSummary(input: SaveGroupChatSummaryInput): Promise<GroupChatSummary>
export async function setSummarySelection(saveId: number, summaryIds: number[]): Promise<void>
```

Use existing SQL escaping style from `src/app/api/interact/chat/route.ts` and `saveDb()` after writes.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/group-chat/group-chat-service.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/services/group-chat-service.ts tests/group-chat/group-chat-service.test.ts
git commit -m "feat: add group chat persistence service"
```

### Task 4: Implement trigger selection and chain limiter logic

**Files:**
- Create: `src/lib/services/group-chat-orchestrator.ts`
- Test: `tests/group-chat/orchestrator.test.ts`

**Step 1: Write the failing test**

```ts
it('always includes @ mentioned characters', () => {
  const selected = selectTriggeredCharacters({
    allCharacters: ['白领', '剑客', '黑客'],
    mentionedCharacters: ['白领'],
    randomCount: 2
  })
  expect(selected).toContain('白领')
})

it('caps chain replies at 3', () => {
  const result = applyChainLimit([1, 2, 3, 4].map(n => ({ id: n } as any)))
  expect(result.length).toBe(3)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/orchestrator.test.ts`
Expected: FAIL because module does not exist.

**Step 3: Write minimal implementation**

```ts
export function selectTriggeredCharacters(input: SelectInput): string[]
export function maybeAddRoastTrigger(input: RoastInput): string[]
export function applyChainLimit<T>(items: T[], max = 3): T[]
```

Rules:
- Mentioned users always included
- Add random 1-2 from remaining characters
- Optional roast trigger only when mention exists
- Return deduplicated list

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/group-chat/orchestrator.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/services/group-chat-orchestrator.ts tests/group-chat/orchestrator.test.ts
git commit -m "feat: add group chat trigger and chain limiter logic"
```

### Task 5: Add streaming send API route

**Files:**
- Create: `src/app/api/group-chat/send/route.ts`
- Modify: `src/lib/ai/client.ts`
- Test: `tests/group-chat/send-api.test.ts`

**Step 1: Write the failing test**

```ts
it('returns 401 when user is not authenticated', async () => {
  const req = new Request('http://localhost/api/group-chat/send', {
    method: 'POST',
    body: JSON.stringify({ content: '今晚停水' })
  })
  const res = await POST(req as any)
  expect(res.status).toBe(401)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/send-api.test.ts`
Expected: FAIL because route is missing.

**Step 3: Write minimal implementation**

Add route with:

```ts
export async function POST(request: NextRequest) {
  // auth check
  // validate content length <= 500
  // fetch participants from characters by user_id
  // select triggers (@ + random)
  // stream events: partial, message, transfer, sticker, done, error
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

Implement `group_chat_transfer` and `send_sticker` tool-handling validation before write.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/group-chat/send-api.test.ts`
Expected: PASS for auth/validation contract.

**Step 5: Commit**

```bash
git add src/app/api/group-chat/send/route.ts src/lib/ai/client.ts tests/group-chat/send-api.test.ts
git commit -m "feat: add streaming group chat send api"
```

### Task 6: Add history and participants APIs

**Files:**
- Create: `src/app/api/group-chat/history/route.ts`
- Create: `src/app/api/group-chat/participants/route.ts`
- Test: `tests/group-chat/query-apis.test.ts`

**Step 1: Write the failing test**

```ts
it('returns paginated history with default limit 50', async () => {
  const req = new Request('http://localhost/api/group-chat/history')
  const res = await GET(req as any)
  expect(res.status).toBe(200)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/query-apis.test.ts`
Expected: FAIL because routes are missing.

**Step 3: Write minimal implementation**

```ts
// history route: parse limit/offset and return { messages }
// participants route: return active characters for current user
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/group-chat/query-apis.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/group-chat/history/route.ts src/app/api/group-chat/participants/route.ts tests/group-chat/query-apis.test.ts
git commit -m "feat: add group chat history and participants apis"
```

### Task 7: Add restart and summary selection APIs

**Files:**
- Create: `src/app/api/group-chat/restart/route.ts`
- Create: `src/app/api/group-chat/summaries/route.ts`
- Create: `src/lib/services/group-chat-summary-service.ts`
- Test: `tests/group-chat/restart-api.test.ts`

**Step 1: Write the failing test**

```ts
it('creates summaries in chunks of 10 and marks messages summarized', async () => {
  const res = await POST(new Request('http://localhost/api/group-chat/restart', {
    method: 'POST',
    body: JSON.stringify({ keepRecentCount: 3 })
  }) as any)
  expect(res.status).toBe(200)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/restart-api.test.ts`
Expected: FAIL because route is missing.

**Step 3: Write minimal implementation**

In summary service:

```ts
export async function restartGroupChatContext(saveId: number, keepRecentCount = 3): Promise<{ created: number }>
```

Behavior:
- Collect unsummarized messages except last N
- Chunk by 10
- Call AI summarizer once per chunk
- Insert into `group_chat_summaries`
- Mark summarized messages

In summaries route:
- `GET` list summaries
- `POST` update selected summaries by `summaryIds`

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/group-chat/restart-api.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/services/group-chat-summary-service.ts src/app/api/group-chat/restart/route.ts src/app/api/group-chat/summaries/route.ts tests/group-chat/restart-api.test.ts
git commit -m "feat: add restart context and summary selection apis"
```

### Task 8: Add group chat UI page and components

**Files:**
- Create: `src/app/game/group-chat/page.tsx`
- Create: `src/components/group-chat/GroupChatContainer.tsx`
- Create: `src/components/group-chat/MessageList.tsx`
- Create: `src/components/group-chat/MessageBubble.tsx`
- Create: `src/components/group-chat/ChatInput.tsx`
- Create: `src/components/group-chat/SummaryManager.tsx`
- Test: `tests/ui/group-chat-page.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders group chat title and input', async () => {
  render(<GroupChatPage />)
  expect(screen.getByText('公寓群聊')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('输入消息...')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/ui/group-chat-page.test.tsx`
Expected: FAIL because page/component is missing.

**Step 3: Write minimal implementation**

Required UI behavior:
- Fetch history on load
- Send message via `/api/group-chat/send`
- Parse SSE events and append messages
- `@` selector from participants
- restart action opens summary manager

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/ui/group-chat-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/game/group-chat/page.tsx src/components/group-chat tests/ui/group-chat-page.test.tsx
git commit -m "feat: add group chat page and core components"
```

### Task 9: Add group chat entry to bottom navigation

**Files:**
- Modify: `src/components/game/BottomNav.tsx`
- Test: `tests/ui/game-shell.test.ts`

**Step 1: Write the failing test**

```ts
it('shows group chat nav item', () => {
  render(<BottomNav />)
  expect(screen.getByText('群聊')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/ui/game-shell.test.ts`
Expected: FAIL because nav item does not exist.

**Step 3: Write minimal implementation**

Add nav item:

```ts
{ href: '/game/group-chat', label: '群聊', icon: '💬', shortLabel: '群聊' }
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/ui/game-shell.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/game/BottomNav.tsx tests/ui/game-shell.test.ts
git commit -m "feat: add group chat navigation entry"
```

### Task 10: Add observability, limits, and final verification

**Files:**
- Modify: `src/app/api/group-chat/send/route.ts`
- Modify: `src/lib/services/group-chat-orchestrator.ts`
- Create: `tests/group-chat/limits.test.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
it('rejects message over 500 chars', async () => {
  const body = { content: 'a'.repeat(501) }
  const res = await POST(new Request('http://localhost/api/group-chat/send', { method: 'POST', body: JSON.stringify(body) }) as any)
  expect(res.status).toBe(400)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/group-chat/limits.test.ts`
Expected: FAIL before limit checks are complete.

**Step 3: Write minimal implementation**

Implement:
- cooldown (3s)
- max triggered character cap (<=5)
- chain cap (<=3)
- structured logs for `trigger_count`, `chain_depth`, `tool_success`, latency
- README update for new `/game/group-chat` feature

**Step 4: Run test and quality verification**

Run:
- `npm run test -- tests/group-chat`
- `npm run test -- tests/ui/group-chat-page.test.tsx`
- `npm run lint`
- `npm run build`

Expected: all PASS.

**Step 5: Commit**

```bash
git add src/app/api/group-chat/send/route.ts src/lib/services/group-chat-orchestrator.ts tests/group-chat/limits.test.ts README.md
git commit -m "chore: enforce group chat limits and document feature"
```

## Notes for implementing engineer

- Reuse existing auth/session pattern from `src/app/api/interact/chat/route.ts`.
- Reuse sticker generation path from `src/app/api/interact/generate-sticker/route.ts` and `src/lib/ai/image-client.ts`.
- Use SQL escaping conventions already used in API routes, and call `saveDb()` after writes.
- Keep features YAGNI-scoped: no WebSocket infra in this iteration.
- If any test is flaky due to `sql.js` environment, isolate with deterministic fixtures and retry only test setup, not assertions.
