import * as React from 'react'
import { Step } from '@/app/lib/actions'
import { PromptForm } from './prompt-form'
import { Badge } from './ui/badge'

interface StepComponentProps {
  step: Step
  index: number
  currentIndex: number
  userAnswer: string
  status: 'skipped' | 'success' | 'fail' | 'finished' | null
  onSubmit: (answer: string) => void
  setInput: React.Dispatch<React.SetStateAction<string>>
}

export function StepComponent({
  step,
  index,
  currentIndex,
  userAnswer,
  status,
  onSubmit,
  setInput
}: StepComponentProps) {
  const isCurrent = currentIndex === index
  const isPast = currentIndex > index

  const isFuture = currentIndex < index

  if (isFuture) {
    return null
  }

  return (
    <div
      className={`bg-white rounded-xl px-5 py-6 mb-3 ${isCurrent ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-neutral-700">
          Step {index + 1}
        </div>
        {isPast && status && <Badge status={status} className="mr-2" />}
      </div>
      <div className="text-neutral-500 mt-3 text-sm leading-5">
        {step.explanation}
      </div>
      {isPast && (
        <div className="mt-4 text-neutral-500 border border-neutral-200 px-2.5 py-1.5 font-mono text-sm rounded-full">
          {step.output}
        </div>
      )}
      {isCurrent && (
        <div className="mt-4">
          <PromptForm
            input={userAnswer}
            placeholder="Enter result..."
            setInput={setInput}
            onSubmit={onSubmit}
            mode="step"
          />
        </div>
      )}
    </div>
  )
}
