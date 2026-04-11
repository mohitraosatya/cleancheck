import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AppRoot() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role === 'OWNER') redirect('/app/dashboard')
  redirect('/app/properties')
}
