"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"

interface OptionCardProps {
  id: string
  label: string
  icon: LucideIcon
  isSelected: boolean
  isDisabled?: boolean
  onClick: () => void
  tooltipText?: string
}

export default function OptionCard({
  id,
  label,
  icon: Icon,
  isSelected,
  isDisabled = false,
  onClick,
  tooltipText,
}: OptionCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        onMouseEnter={() => isDisabled && tooltipText && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => isDisabled && tooltipText && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`w-full h-full flex flex-col items-center justify-center p-4 rounded-xl shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isSelected
            ? "bg-indigo-500 text-white border-2 border-indigo-600"
            : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-300"
        } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"}`}
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
      >
        <Icon className={`w-8 h-8 mb-2 ${isSelected ? "text-white" : "text-indigo-500"}`} />
        <span className="text-sm font-medium">{label}</span>
      </button>

      {showTooltip && tooltipText && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded shadow-lg z-10 whitespace-nowrap">
          {tooltipText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  )
}
