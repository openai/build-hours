'use client'

import * as React from 'react'
import { IconArrowRight } from '@/components/ui/icons'

interface WarningProps {
  text: string
  onReset: () => void
}

export function Warning({ text, onReset }: WarningProps) {
  return (
    <div className="h-full flex justify-center items-center">
      <div className="w-2/3">
        <div className="text-center bg-rose-200 border px-6 py-8 border-rose-500 text-rose-600 rounded-lg">
          <div>{text}</div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="flex items-center bg-black text-white text-sm p-2 sm:px-4 rounded-full"
            onClick={onReset}
          >
            Retry
            <IconArrowRight className="size-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}
