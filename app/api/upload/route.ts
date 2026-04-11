import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { storage } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string | null) ?? 'tasks'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  // Basic size limit: 10 MB
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })

  // Only allow images
  if (!file.type.startsWith('image/'))
    return NextResponse.json({ error: 'Only image files allowed' }, { status: 415 })

  const url = await storage.save(file, folder)
  return NextResponse.json({ url })
}
