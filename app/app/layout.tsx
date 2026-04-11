import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Nav from '@/components/layout/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-neutral-50">
      <Nav user={user} />
      {/* Offset for desktop top-nav, mobile adds bottom padding via pb-safe in nav */}
      <main className="pt-0 pb-20 md:pt-14 md:pb-0">{children}</main>
    </div>
  )
}
