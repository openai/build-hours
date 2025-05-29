"use client"

import { XCircle } from "lucide-react"

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <XCircle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{message}</p>
        </div>
        {onDismiss && (
          <button type="button" className="ml-auto pl-3 text-red-500 hover:text-red-700" onClick={onDismiss}>
            <span className="sr-only">Dismiss</span>
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>
    </div>
  )
}
