import { describe, it, expect } from 'vitest'
import { evaluateFailure } from '@/lib/services/economy-service'
import { validateJobSalary } from '@/lib/services/job-service'

describe('failure rules', () => {
  it('marks game over when debt persists and no tenants', () => {
    const state = evaluateFailure({ currency: -1, debtDays: 15, tenantCount: 0 })
    expect(state.gameOver).toBe(true)
    expect(state.shouldRemoveSave).toBe(true)
  })

  it('warns when debt persists with tenants', () => {
    const state = evaluateFailure({ currency: -1, debtDays: 8, tenantCount: 1 })
    expect(state.gameOver).toBe(false)
    expect(state.shouldRemoveSave).toBe(false)
  })

  it('does not fail when currency is positive', () => {
    const state = evaluateFailure({ currency: 100, debtDays: 0, tenantCount: 0 })
    expect(state.gameOver).toBe(false)
  })

  it('does not fail when debt days are low', () => {
    const state = evaluateFailure({ currency: -1, debtDays: 5, tenantCount: 0 })
    expect(state.gameOver).toBe(false)
  })

  it('fails exactly at 15 days debt with no tenants', () => {
    const state = evaluateFailure({ currency: -1, debtDays: 15, tenantCount: 0 })
    expect(state.gameOver).toBe(true)
  })

  it('does not fail at 14 days debt', () => {
    const state = evaluateFailure({ currency: -1, debtDays: 14, tenantCount: 0 })
    expect(state.gameOver).toBe(false)
  })
})

describe('job salary validation', () => {
  it('clamps salary to valid range', () => {
    expect(validateJobSalary(50)).toBe(100)
    expect(validateJobSalary(150)).toBe(150)
    expect(validateJobSalary(400)).toBe(300)
  })

  it('accepts valid salaries', () => {
    expect(validateJobSalary(100)).toBe(100)
    expect(validateJobSalary(200)).toBe(200)
    expect(validateJobSalary(300)).toBe(300)
  })
})