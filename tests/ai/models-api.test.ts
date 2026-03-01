import { describe, it, expect } from 'vitest'
import { normalizeModelId, isValidModelId, fetchModels } from '@/lib/ai/models'

describe('model discovery', () => {
  it('maps /models response to id list', () => {
    const ids = ['gpt-4o', 'gpt-4o-mini']
    expect(ids.length).toBeGreaterThan(0)
  })

  it('normalizes model id', () => {
    expect(normalizeModelId('  gpt-4o  ')).toBe('gpt-4o')
  })

  it('validates model id', () => {
    expect(isValidModelId('gpt-4o')).toBe(true)
    expect(isValidModelId('')).toBe(false)
    expect(isValidModelId('invalid model')).toBe(false)
  })
})