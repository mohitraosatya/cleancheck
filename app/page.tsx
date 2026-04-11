import { redirect } from 'next/navigation'

// Root → middleware handles redirect to /app or /login
export default function Root() {
  redirect('/app')
}
