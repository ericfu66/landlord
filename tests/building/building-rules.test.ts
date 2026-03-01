import { describe, it, expect } from 'vitest'
import { validatePlacement, calculateBuildCost, calculateDemolishRefund } from '@/lib/services/building-service'

describe('room placement', () => {
  it('rejects overlap', () => {
    const existingRooms = [
      { floor: 1, positionStart: 1, positionEnd: 4 }
    ]
    const newRoom = { floor: 1, positionStart: 3, positionEnd: 5 }
    
    const result = validatePlacement(existingRooms, newRoom)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('房间位置重叠')
  })

  it('accepts non-overlapping rooms', () => {
    const existingRooms = [
      { floor: 1, positionStart: 1, positionEnd: 3 }
    ]
    const newRoom = { floor: 1, positionStart: 4, positionEnd: 6 }
    
    const result = validatePlacement(existingRooms, newRoom)
    expect(result.valid).toBe(true)
  })

  it('accepts rooms on different floors', () => {
    const existingRooms = [
      { floor: 1, positionStart: 1, positionEnd: 3 }
    ]
    const newRoom = { floor: 2, positionStart: 1, positionEnd: 3 }
    
    const result = validatePlacement(existingRooms, newRoom)
    expect(result.valid).toBe(true)
  })

  it('rejects invalid position range', () => {
    const newRoom = { floor: 1, positionStart: 5, positionEnd: 3 }
    
    const result = validatePlacement([], newRoom)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('房间起始位置必须小于结束位置')
  })

  it('rejects position outside bounds', () => {
    const newRoom = { floor: 1, positionStart: 9, positionEnd: 12 }
    
    const result = validatePlacement([], newRoom)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('房间位置超出范围')
  })
})

describe('build costs', () => {
  it('calculates bedroom cost', () => {
    const cost = calculateBuildCost('bedroom', 3, false)
    expect(cost.currency).toBe(900)
    expect(cost.energy).toBe(1)
  })

  it('calculates functional room cost', () => {
    const cost = calculateBuildCost('functional', 2, false)
    expect(cost.currency).toBe(800)
    expect(cost.energy).toBe(1)
  })

  it('calculates empty room cost', () => {
    const cost = calculateBuildCost('empty', 3, false)
    expect(cost.currency).toBe(0)
    expect(cost.energy).toBe(0)
  })

  it('adds new floor cost', () => {
    const cost = calculateBuildCost('bedroom', 2, true)
    expect(cost.currency).toBe(5600)
    expect(cost.energy).toBe(2)
  })
})

describe('demolish refund', () => {
  it('calculates 30% refund', () => {
    const refund = calculateDemolishRefund('bedroom', 3)
    expect(refund).toBe(270)
  })
})