import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'

export async function GET() {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ user: null })
  }
  
  const user = await getUserById(session.userId)
  
  return NextResponse.json({ user })
}