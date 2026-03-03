'use client'

import { createContext, useContext, ReactNode } from 'react'

interface GameStateContextType {
  refreshGameState: () => void
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined)

export function GameStateProvider({ 
  children, 
  onRefresh 
}: { 
  children: ReactNode
  onRefresh: () => void 
}) {
  return (
    <GameStateContext.Provider value={{ refreshGameState: onRefresh }}>
      {children}
    </GameStateContext.Provider>
  )
}

export function useGameState() {
  const context = useContext(GameStateContext)
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider')
  }
  return context
}
