import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getDb, saveDb } from '@/lib/db'

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)

export interface SessionPayload {
  userId: number
  username: string
  role: string
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) return null
  
  return verifyToken(token)
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload)
  const cookieStore = await cookies()
  
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function getUserById(userId: number): Promise<{ id: number; username: string; role: string; is_banned: boolean } | null> {
  const db = await getDb()
  const result = db.exec(
    'SELECT id, username, role, is_banned FROM users WHERE id = ?',
    [userId]
  )
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    username: row[1] as string,
    role: row[2] as string,
    is_banned: row[3] === 1
  }
}