import * as React from 'react'
import { PromptForm } from './prompt-form'
import { IconRefresh } from './ui/icons'

interface ProblemCardProps {
  input: string
  setInput: (input: string) => void
  onSubmit: (message: string) => void
  problem: string | null
  onRestart: () => void
  isSubmitted: boolean
}

export function ProblemCard({
  input,
  setInput,
  onSubmit,
  problem,
  onRestart,
  isSubmitted
}: ProblemCardProps) {
  const handleNewMessage = (message: string) => {
    setInput('')
    onSubmit(message)
  }

  return (
    <div
      className={`flex justify-center w-full sm:w-2/3 md:w-1/3 transition-all duration-500 mx-16 ${isSubmitted ? 'mt-8' : 'h-full'}`}
    >
      {problem ? (
        <>
          <div className="w-full mx-4 sm:mx-2 md:mx-0 flex justify-between items-center overflow-hidden bg-white shadow-lg px-2 rounded-full border border-neutral-100">
            <div className="font-mono px-2 py-2.5 text-sm text-neutral-600">
              {problem}
            </div>
            <button onClick={onRestart} className="p-1.5 my-2 mr-1">
              <IconRefresh className="size-4 text-neutral-800 font-bold" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="h-full flex flex-col justify-center items-center px-8">
            <div className="text-center">
              <div className="text-lg font-medium text-neutral-800">
                Hey there!
              </div>
              <div className="text-neutral-700 mt-2 mx-8">
                I am your math tutor. Enter a math problem, and I&lsquo;ll help
                you solve it.
              </div>
            </div>
            <div className="mt-6 w-full">
              <PromptForm
                input={input}
                placeholder="(2x + 8) * 16 = 32"
                setInput={setInput}
                onSubmit={handleNewMessage}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
