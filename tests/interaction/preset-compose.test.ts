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