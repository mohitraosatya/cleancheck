import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: 'Open',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    NEEDS_REDO: 'Needs Redo',
  }
  return map[status] ?? status
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    OPEN: 'bg-neutral-100 text-neutral-600',
    SUBMITTED: 'bg-black text-white',
    APPROVED: 'bg-neutral-800 text-white',
    NEEDS_REDO: 'bg-neutral-200 text-neutral-800',
  }
  return map[status] ?? 'bg-neutral-100 text-neutral-600'
}

export function levelLabel(level: string | null | undefined): string {
  const map: Record<string, string> = {
    NONE: 'None',
    LOW: 'Low',
    MEDIUM: 'Medium',
    FULL: 'Full',
  }
  return level ? (map[level] ?? level) : '—'
}

export function levelClass(level: string | null | undefined): string {
  const map: Record<string, string> = {
    NONE: 'bg-neutral-100 text-neutral-500',
    LOW: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    FULL: 'bg-green-100 text-green-700',
  }
  return level ? (map[level] ?? 'bg-neutral-100 text-neutral-500') : 'bg-neutral-100 text-neutral-400'
}
