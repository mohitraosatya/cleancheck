import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface StorageAdapter {
  save(file: File, folder: string): Promise<string>
  delete(url: string): Promise<void>
}

// ── Local filesystem adapter (dev) ────────────────────────────────────────────
// Swap this for an S3Adapter by implementing the same interface.

class LocalStorage implements StorageAdapter {
  private root: string

  constructor() {
    this.root = path.join(process.cwd(), 'public', 'uploads')
  }

  async save(file: File, folder: string): Promise<string> {
    const bytes = await file.arrayBuffer()
    const buf = Buffer.from(bytes)

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const name = `${crypto.randomUUID()}.${ext}`
    const dir = path.join(this.root, folder)

    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, name), buf)

    return `/uploads/${folder}/${name}`
  }

  async delete(url: string): Promise<void> {
    // url is like /uploads/tasks/uuid.jpg
    const filePath = path.join(process.cwd(), 'public', url)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  }
}

export const storage: StorageAdapter = new LocalStorage()
