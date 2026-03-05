interface SelectInput {
  allCharacters: string[]
  mentionedCharacters: string[]
  randomCount?: number
  randomFn?: () => number
}

interface RoastInput {
  selectedCharacters: string[]
  allCharacters: string[]
  mentionedCharacters: string[]
  probability?: number
  roastCount?: number
  randomFn?: () => number
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function pickRandomFromList(list: string[], count: number, randomFn: () => number): string[] {
  const pool = [...list]
  const picked: string[] = []

  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(randomFn() * pool.length)
    const [value] = pool.splice(index, 1)
    if (value) {
      picked.push(value)
    }
  }

  return picked
}

export function selectTriggeredCharacters(input: SelectInput): string[] {
  const randomFn = input.randomFn ?? Math.random
  const mentioned = unique(input.mentionedCharacters)
  const base = unique(input.allCharacters)
  const remaining = base.filter((name) => !mentioned.includes(name))
  const randomCount = Math.max(0, input.randomCount ?? 1)
  const randomPicked = pickRandomFromList(remaining, randomCount, randomFn)

  return unique([...mentioned, ...randomPicked])
}

export function maybeAddRoastTrigger(input: RoastInput): string[] {
  const randomFn = input.randomFn ?? Math.random
  const probability = input.probability ?? 0.35
  const roastCount = Math.max(0, input.roastCount ?? 1)
  const hasMention = input.mentionedCharacters.length > 0

  if (!hasMention || randomFn() > probability) {
    return unique(input.selectedCharacters)
  }

  const selected = unique(input.selectedCharacters)
  const pool = unique(input.allCharacters).filter((name) => !selected.includes(name))
  const roastPicked = pickRandomFromList(pool, roastCount, randomFn)

  return unique([...selected, ...roastPicked])
}

export function applyChainLimit<T>(items: T[], max = 3): T[] {
  return items.slice(0, Math.max(0, max))
}
