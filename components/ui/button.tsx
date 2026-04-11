import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variant === 'primary' && 'bg-black text-white hover:bg-neutral-800 active:bg-neutral-700',
          variant === 'secondary' && 'bg-neutral-100 text-black hover:bg-neutral-200 active:bg-neutral-300',
          variant === 'ghost' && 'bg-transparent text-black hover:bg-neutral-100 active:bg-neutral-200',
          variant === 'danger' && 'bg-black text-white hover:bg-neutral-800',
          size === 'sm' && 'text-sm px-3 py-1.5',
          size === 'md' && 'text-sm px-4 py-2.5',
          size === 'lg' && 'text-base px-6 py-3.5',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
