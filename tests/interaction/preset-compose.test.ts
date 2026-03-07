import { describe, it, expect } from 'vitest'
import { composeMessages, canUseFlirtMode, getInteractionModeInfo } from '@/lib/services/preset-service'

describe('preset compose', () => {
it('always injects fixed entries', () => {
    const messages = composeMessages({
      fixed: { persona: 'p', memory: 'm', history: 'h' },
      custom: [],
      userInput: 'hi'
    })
    
    expect(messages.length).toBeGreaterThan(2)
    expect(messages.some((m) => m.content === 'p')).toBe(true)
    expect(messages.some((m) => m.content.includes('m'))).toBe(true)
    expect(messages.some((m) => m.content === '房东对你说：hi')).toBe(true)
  })

  it('includes custom entries in correct order', () => {
    const messages = composeMessages({
      fixed: { persona: 'p', memory: 'm', history: 'h' },
      custom: [
        { id: '1', role: 'system', content: 'custom1', order: 1, isFixed: false },
        { id: '2', role: 'system', content: 'custom2', order: 0, isFixed: false }
      ],
      userInput: 'hi'
    })

    const custom1Index = messages.findIndex((m) => m.content === 'custom1')
    const custom2Index = messages.findIndex((m) => m.content === 'custom2')
    expect(custom2Index).toBeLessThan(custom1Index)
  })

it('user input is last', () => {
    const messages = composeMessages({
      fixed: { persona: 'p', memory: 'm', history: 'h' },
      custom: [{ id: '1', role: 'user', content: 'c', order: 0, isFixed: false }],
      userInput: 'test input'
    })

    expect(messages[messages.length - 1].content).toBe('房东对你说：test input')
  })

  it('uses custom persona entry when provided', () => {
    const messages = composeMessages({
      fixed: { persona: 'default persona', memory: 'm', history: 'h' },
      custom: [
        { id: '1', role: 'system', content: 'custom persona', order: 0, isFixed: false, type: 'persona' }
      ],
      userInput: 'hi'
    })

    // 应该使用自定义人设而非默认人设
    expect(messages.some((m) => m.content === 'custom persona')).toBe(true)
    expect(messages.some((m) => m.content === 'default persona')).toBe(false)
  })

  it('places persona entry at correct position in order', () => {
    const messages = composeMessages({
      fixed: { persona: 'p', memory: 'm', history: 'h' },
      custom: [
        { id: '1', role: 'system', content: 'first custom', order: 0, isFixed: false, type: 'custom' },
        { id: '2', role: 'system', content: 'persona entry', order: 1, isFixed: false, type: 'persona' },
        { id: '3', role: 'system', content: 'last custom', order: 2, isFixed: false, type: 'custom' }
      ],
      userInput: 'hi'
    })

    // 找到各条目的索引位置
    const personaIndex = messages.findIndex((m) => m.content === 'persona entry')
    const firstIndex = messages.findIndex((m) => m.content === 'first custom')
    const lastIndex = messages.findIndex((m) => m.content === 'last custom')

    // 人设条目应该出现在所有自定义条目之前（因为人设类型被优先处理）
    expect(personaIndex).toBeLessThan(firstIndex)
    expect(personaIndex).toBeLessThan(lastIndex)
  })

  it('uses custom memory entry when provided', () => {
    const messages = composeMessages({
      fixed: { persona: 'p', memory: 'default memory', history: 'h' },
      custom: [
        { id: '1', role: 'system', content: 'custom memory', order: 0, isFixed: false, type: 'memory' }
      ],
      userInput: 'hi'
    })

    expect(messages.some((m) => m.content === 'custom memory')).toBe(true)
    expect(messages.some((m) => m.content.includes('default memory'))).toBe(false)
  })

  it('uses custom history entry when provided', () => {
    const messages = composeMessages({
      fixed: { persona: 'p', memory: 'm', history: 'default history' },
      custom: [
        { id: '1', role: 'system', content: 'custom history', order: 0, isFixed: false, type: 'history' }
      ],
      userInput: 'hi'
    })

    expect(messages.some((m) => m.content === 'custom history')).toBe(true)
    expect(messages.some((m) => m.content.includes('default history'))).toBe(false)
  })

  describe('personaPosition', () => {
    it('places persona first when personaPosition is first', () => {
      const messages = composeMessages(
        {
          fixed: { persona: 'persona content', memory: 'memory content', history: 'history content' },
          custom: [],
          userInput: 'hi',
          personaPosition: 'first'
        },
        'worldview content'
      )

      // 第一条应该是人设（在世界观之前）
      expect(messages[0].content).toBe('persona content')
      // 第二条应该是世界观
      expect(messages[1].content).toContain('worldview content')
    })

    it('places persona after worldview by default', () => {
      const messages = composeMessages(
        {
          fixed: { persona: 'persona content', memory: 'memory content', history: 'history content' },
          custom: [],
          userInput: 'hi'
        },
        'worldview content'
      )

      // 第一条应该是世界观
      expect(messages[0].content).toContain('worldview content')
      // 第二条应该是人设
      expect(messages[1].content).toBe('persona content')
    })

    it('places persona before history when personaPosition is before_history', () => {
      const messages = composeMessages(
        {
          fixed: { persona: 'persona content', memory: 'memory content', history: 'history content' },
          custom: [],
          userInput: 'hi',
          personaPosition: 'before_history'
        },
        'worldview content'
      )

      const personaIndex = messages.findIndex(m => m.content === 'persona content')
      const historyIndex = messages.findIndex(m => m.content.includes('history content'))
      
      expect(personaIndex).toBeLessThan(historyIndex)
    })

    it('places persona last when personaPosition is last', () => {
      const messages = composeMessages(
        {
          fixed: { persona: 'persona content', memory: 'memory content', history: 'history content' },
          custom: [],
          userInput: 'hi',
          personaPosition: 'last'
        },
        'worldview content'
      )

      // 最后一条应该是用户输入
      expect(messages[messages.length - 1].content).toBe('房东对你说：hi')
      // 倒数第二条应该是人设
      expect(messages[messages.length - 2].content).toBe('persona content')
    })
  })
})

describe('flirt mode unlock', () => {
  it('unlocks at favorability >= 50', () => {
    expect(canUseFlirtMode(51)).toBe(true)
    expect(canUseFlirtMode(50)).toBe(true)
    expect(canUseFlirtMode(49)).toBe(false)
    expect(canUseFlirtMode(0)).toBe(false)
  })

  it('returns correct info for each mode', () => {
    const dailyInfo = getInteractionModeInfo('daily', 0)
    expect(dailyInfo.unlocked).toBe(true)

    const flirtInfo = getInteractionModeInfo('flirt', 30)
    expect(flirtInfo.unlocked).toBe(false)

    const flirtUnlocked = getInteractionModeInfo('flirt', 60)
    expect(flirtUnlocked.unlocked).toBe(true)
  })
})