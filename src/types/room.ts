export interface Room {
  id: number
  saveId: number
  floor: number
  positionStart: number
  positionEnd: number
  roomType: 'empty' | 'bedroom' | 'functional'
  description?: string
  characterName?: string
  isOutdoor: boolean
}

export interface RoomPlacement {
  floor: number
  positionStart: number
  positionEnd: number
}

export interface BuildCost {
  currency: number
  energy: number
}

export const BUILD_COSTS: Record<string, BuildCost> = {
  newFloor: { currency: 5000, energy: 1 },
  emptyRoom: { currency: 0, energy: 0 },
  bedroom: { currency: 300, energy: 1 },
  functional: { currency: 400, energy: 1 },
  demolish: { currency: 0, energy: 0 }
}

export const FLOOR_CELLS = 10
export const CELL_SIZE_SQUARE_METERS = 15