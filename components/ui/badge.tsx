import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'dark' | 'low' | 'outline'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-neutral-100 text-neutral-600',
        variant === 'dark' && 'bg-black text-white',
        variant === 'low' && 'bg-neutral-800 text-white',
        variant === 'outline' && 'border border-neutral-300 text-neutral-600 bg-white',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
