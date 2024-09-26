import * as React from 'react'
import { IconCheck, IconClose, IconSeparator } from './icons'

interface BadgeProps {
  status: 'skipped' | 'success' | 'fail' | 'finished' | null
  className: string
}

export function Badge({ status, className }: BadgeProps) {
  let color
  let icon

  switch (status) {
    case 'success':
      color = 'bg-emerald-600'
      icon = <IconCheck className="size-2" />
      break
    case 'fail':
      color = 'bg-rose-600'
      icon = <IconClose className="size-2" />
      break
    case 'skipped':
      color = 'bg-gray-500'
      icon = <IconSeparator className="size-2" />
      break
    default:
      return null
  }

  return (
    <div
      className={`p-1 rounded-full text-white font-bold ${color} ${className}`}
    >
      {icon}
    </div>
  )
}
