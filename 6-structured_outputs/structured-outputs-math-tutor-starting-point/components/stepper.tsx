'use client'

import * as React from 'react'
import { IconArrowRight } from '@/components/ui/icons'

interface StepperProps {
  currentStep: number
  totalSteps: number
  onSkipStep: () => void
  finished?: boolean
}

export function Stepper({
  currentStep,
  totalSteps,
  onSkipStep,
  finished
}: StepperProps) {
  return (
    <div className="flex w-full relative items-center justify-center">
      <div className="flex items-center justify-center grow pb-2">
        <div className="flex justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-6 h-1.5 mx-1 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-black' : 'bg-gray-300'
              }`}
            ></div>
          ))}
        </div>
      </div>
      <button
        className="absolute flex items-center right-2 bottom-0 bg-black text-white text-sm p-2 sm:px-4 rounded-full"
        onClick={onSkipStep}
      >
        <div className="hidden sm:block sm:mr-2">
          {finished ? 'Restart' : 'Skip step'}{' '}
        </div>
        <IconArrowRight className="size-4" />
      </button>
    </div>
  )
}
