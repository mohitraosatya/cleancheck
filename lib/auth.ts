import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production-min-32-chars'
)

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'EMPLOYEE'
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

/** For use in Server Components and Route Handlers (reads Next.js cookie store) */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** For use in Route Handlers where you have the raw request */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}
