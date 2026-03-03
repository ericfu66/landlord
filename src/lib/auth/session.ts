import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)

export interface SessionPayload {
  userId: number
  username: string
  role: string
  needsOnboarding?: boolean
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

// 创建session并返回token（用于API路由中手动设置cookie）
export async function createSession(
  userId: number, 
  needsOnboarding?: boolean
): Promise<string> {
  const { getUserById } = await import('./repo')
  const user = await getUserById(userId)
  
  if (!user) {
    throw new Error('User not found')
  }
  
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    needsOnboarding,
  }
  
  return signToken(payload)
}