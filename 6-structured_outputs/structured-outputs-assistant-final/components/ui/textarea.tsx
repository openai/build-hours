import * as React from 'react'

import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onKeyDown, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex resize-none min-h-[60px] w-full bg-transparent py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none  disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        onKeyDown={onKeyDown}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
