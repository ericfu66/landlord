import { describe, it, expect } from 'vitest'
import { applyChainLimit, maybeAddRoastTrigger, selectTriggeredCharacters } from '@/lib/services/group-chat-orchestrator'

describe('group chat orchestrator', () => {
  it('always includes @ mentioned characters', () => {
    const selected = selectTriggeredCharacters({
      allCharacters: ['白领', '剑客', '黑客'],
      mentionedCharacters: ['白领'],
      randomCount: 2,
      randomFn: () => 0
    })

    expect(selected).toContain('白领')
  })

  it('returns deduplicated trigger list', () => {
    const selected = selectTriggeredCharacters({
      allCharacters: ['白领', '剑客', '黑客'],
      mentionedCharacters: ['白领', '白领'],
      randomCount: 2,
      randomFn: () => 0
    })

    expect(new Set(selected).size).toBe(selected.length)
  })

  it('only adds roast trigger when mention exists', () => {
    const withMention = maybeAddRoastTrigger({
      selectedCharacters: ['白领'],
      allCharacters: ['白领', '剑客', '黑客'],
      mentionedCharacters: ['白领'],
      randomFn: () => 0,
      probability: 1,
      roastCount: 1
    })
    const withoutMention = maybeAddRoastTrigger({
      selectedCharacters: ['白领'],
      allCharacters: ['白领', '剑客', '黑客'],
      mentionedCharacters: [],
      randomFn: () => 0,
      probability: 1,
      roastCount: 1
    })

    expect(withMention.length).toBeGreaterThan(1)
    expect(withoutMention).toEqual(['白领'])
  })

  it('caps chain replies at 3', () => {
    const result = applyChainLimit([1, 2, 3, 4].map((n) => ({ id: n })))
    expect(result.length).toBe(3)
  })
})
