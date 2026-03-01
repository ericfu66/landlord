import { describe, it, expect } from 'vitest'
import { pickLastThreeRounds, clampValue, clampDelta } from '@/lib/services/variables-service'

describe('variable context window', () => {
  it('returns latest 6 messages', () => {
    const msgs = Array.from({ length: 10 }).map((_, i) => ({
      role: i % 2 ? 'assistant' : 'user' as const,
      content: String(i)
    }))
    
    const result = pickLastThreeRounds(msgs)
    expect(result).toHaveLength(6)
    expect(result[0].content).toBe('4')
    expect(result[5].content).toBe('9')
  })

  it('returns all messages if less than 6', () => {
    const msgs = Array.from({ length: 4 }).map((_, i) => ({
      role: i % 2 ? 'assistant' : 'user' as const,
      content: String(i)
    }))
    
    const result = pickLastThreeRounds(msgs)
    expect(result).toHaveLength(4)
  })

  it('handles empty array', () => {
    const result = pickLastThreeRounds([])
    expect(result).toHaveLength(0)
  })
})

describe('value clamping', () => {
  it('clamps values to valid range', () => {
    expect(clampValue(150)).toBe(100)
    expect(clampValue(-150)).toBe(-100)
    expect(clampValue(50)).toBe(50)
    expect(clampValue(-50)).toBe(-50)
  })

  it('clamps deltas to valid range', () => {
    expect(clampDelta(15, -10, 10)).toBe(10)
    expect(clampDelta(-15, -10, 10)).toBe(-10)
    expect(clampDelta(5, -10, 10)).toBe(5)
  })

  it('supports custom ranges', () => {
    expect(clampValue(150, 0, 50)).toBe(50)
    expect(clampValue(-10, 0, 50)).toBe(0)
  })
})