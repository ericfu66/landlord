export interface MultiplayerSettings {
  userId: number
  allowVisits: boolean
  allowInteractions: boolean
  allowCharacterInteractions: boolean
}

export interface VisitRecord {
  id: number
  hostUserId: number
  visitorUserId: number
  visitedAt: string
  visitorName?: string
}

export interface VisitableUser {
  userId: number
  username: string
  totalFloors: number
  characterCount: number
  allowVisits: boolean
}

export interface RemoteBuilding {
  floors: Array<{
    floor: number
    rooms: Array<{
      id: number
      roomType: string
      name: string
      description: string
      characterName?: string
      characterPortrait?: string
    }>
  }>
}

export interface RemoteCharacter {
  name: string
  template: any
  portraitUrl?: string
  mood: string
  favorability: number
}

export interface VisitorInteraction {
  characterName: string
  hostUserId: number
  message: string
}

export interface VisitorInteractionResponse {
  reply: string
  mood?: string
}
