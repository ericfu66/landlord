'use client'

interface StatusBarProps {
  currency: number
  energy: number
  time?: string
  weather?: string
}

export default function StatusBar({ 
  currency = 1000, 
  energy = 3, 
  time = '08:00', 
  weather = '晴' 
}: StatusBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      <div className="glass-card mx-4 mt-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">☀️</span>
              <span className="text-sm">{time}</span>
              <span className="text-xs text-gray-400">{weather}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">💰</span>
              <span className="font-medium">{currency.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-green-400">⚡</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-4 rounded-sm ${
                      i < energy ? 'bg-green-400' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}