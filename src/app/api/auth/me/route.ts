import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ user: null })
  }
  
  const db = await getDb()
  const result = db.exec(`
    SELECT 
      id, username, role, api_config,
      avatar_name, avatar_age, avatar_appearance, avatar_personality, avatar_background,
      discord_username, discord_avatar,
      needs_onboarding, onboarding_step
    FROM users 
    WHERE id = ${session.userId}
  `)

  if (!result || !result[0]?.values?.length) {
    return NextResponse.json({ user: null })
  }

  const row = result[0].values[0]
  
  const user = {
    id: row[0],
    username: row[1],
    role: row[2],
    apiConfig: row[3] ? JSON.parse(row[3] as string) : null,
    avatar: {
      name: row[4],
      age: row[5],
      appearance: row[6],
      personality: row[7],
      background: row[8]
    },
    discord: {
      username: row[9],
      avatar: row[10]
    },
    needsOnboarding: row[11] === 1,
    onboardingStep: row[12]
  }
  
  return NextResponse.json({ user })
}