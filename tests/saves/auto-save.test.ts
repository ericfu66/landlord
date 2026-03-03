import { describe, it, expect } from 'vitest'
import { shouldAutoSaveOn } from '@/lib/services/save-service'

describe('autosave triggers', () => {
  it('autosaves after recruit and daily settlement', () => {
    expect(shouldAutoSaveOn('recruit')).toBe(true)
    expect(shouldAutoSaveOn('daily_settlement')).toBe(true)
  })

  it('autosaves after building', () => {
    expect(shouldAutoSaveOn('building')).toBe(true)
  })

  it('autosaves after interaction', () => {
    expect(shouldAutoSaveOn('interaction')).toBe(true)
  })

  it('does not autosave on manual trigger', () => {
    expect(shouldAutoSaveOn('manual')).toBe(false)
  })
})
