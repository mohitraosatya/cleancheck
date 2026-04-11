import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAppRoute = pathname.startsWith('/app')
  const isAuthRoute = pathname === '/login' || pathname === '/'

  const token = request.cookies.get('token')?.value
  const user = token ? await verifyToken(token) : null

  // Protect /app/* — redirect unauthenticated to /login
  if (isAppRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Already logged in — redirect away from login/root
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
}
