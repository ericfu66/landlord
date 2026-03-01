interface CharacterCardProps {
  name: string
  age: number
  gender: string
  identity: string
  tags: string[]
  portraitUrl?: string
  favorability: number
  mood: string
  rent: number
  onClick?: () => void
}

export default function CharacterCard({
  name,
  age,
  gender,
  identity,
  tags,
  portraitUrl,
  favorability,
  mood,
  rent,
  onClick
}: CharacterCardProps) {
  return (
    <div 
      className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl flex-shrink-0">
          {portraitUrl ? (
            <img src={portraitUrl} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            gender === '女' ? '👩' : '👨'
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate">{name}</h3>
            <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full">{identity}</span>
          </div>
          
          <p className="text-sm text-gray-400">{age}岁 · {gender}</p>
          
          <div className="flex gap-1 mt-1 flex-wrap">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 bg-purple-500/20 rounded text-purple-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm">
        <div className="flex items-center gap-1">
          <span className="text-pink-400">❤️</span>
          <span>{favorability}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{mood}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400">💰</span>
          <span>{rent}/天</span>
        </div>
      </div>
    </div>
  )
}