import { describe, it, expectTypeOf } from 'vitest'
import type { GroupChatMessage, GroupChatSummary, GroupChatMessageType } from '@/types/group-chat'

describe('group chat types', () => {
  it('has strict message type union', () => {
    expectTypeOf<GroupChatMessageType>().toEqualTypeOf<'text' | 'transfer' | 'sticker' | 'summary'>()
  })

  it('has summary selection field', () => {
    expectTypeOf<GroupChatSummary['selected']>().toEqualTypeOf<boolean>()
  })

  it('has required message fields', () => {
    expectTypeOf<GroupChatMessage['saveId']>().toEqualTypeOf<number>()
    expectTypeOf<GroupChatMessage['senderType']>().toEqualTypeOf<'player' | 'character' | 'system'>()
    expectTypeOf<GroupChatMessage['senderName']>().toEqualTypeOf<string>()
    expectTypeOf<GroupChatMessage['content']>().toEqualTypeOf<string>()
    expectTypeOf<GroupChatMessage['messageType']>().toEqualTypeOf<GroupChatMessageType>()
  })
})