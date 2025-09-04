// Solution.tsx
import * as React from 'react'
import { Spinner } from './ui/spinner'
import { StepComponent } from './step'
import { Stepper } from './stepper'
import Confetti from './ui/confetti'
import { Warning } from './ui/warning'
import { useSolution } from '@/lib/useSolution'

interface SolutionProps {
  problem: string | null
  onReset: () => void
  onSolutionFetched: (responseContent: any) => void
}

export function Solution({
  problem,
  onReset,
  onSolutionFetched
}: SolutionProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const {
    loading,
    hints,
    currentHintIndex,
    userAnswer,
    finalAnswer,
    refusal,
    statuses,
    setUserAnswer,
    handleSkipStep,
    handleCheckAnswer
  } = useSolution({ problem, onSolutionFetched, onReset })

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [hints, currentHintIndex])

  const handleAnswerSubmit = (answer: string) => {
    setUserAnswer(answer)
    handleCheckAnswer()
  }

  if (!problem) {
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    )
  }

  if (refusal) {
    return (
      <div className="flex justify-center items-center h-full">
        <Warning
          text="Sorry, I can't answer that! Please only ask about math problems."
          onReset={onReset}
        />
      </div>
    )
  }

  if (hints.length == 0 && !loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Warning
          text="Uh oh, it seems your question is not a valid math problem. Please retry with something that can be solved!"
          onReset={onReset}
        />
      </div>
    )
  }

  return (
    <div className="size-full flex flex-col items-center justify-between">
      {currentHintIndex === hints.length && <Confetti />}
      <div
        ref={containerRef}
        className="overflow-y-scroll h-65vh w-full sm:w-2/3 md:w-1/3 relative mt-16 mb-8 p-4 py-8"
      >
        {hints.map((hint, index) => (
          <StepComponent
            key={index}
            step={hint}
            index={index}
            currentIndex={currentHintIndex}
            userAnswer={userAnswer}
            status={statuses[index]}
            onSubmit={handleAnswerSubmit}
            setInput={setUserAnswer}
          />
        ))}
        {currentHintIndex === hints.length && (
          <div className="mt-4 px-5 py-6 bg-black rounded-xl">
            <div className="text-neutral-300 text-sm">Final Answer</div>
            <div className="text-neutral-100 mt-2 font-bold font-mono text-xl">
              {finalAnswer}
            </div>
          </div>
        )}
      </div>
      <div className="w-full mb-8 flex items-baseline px-4 py-2">
        <Stepper
          currentStep={currentHintIndex}
          totalSteps={hints.length}
          onSkipStep={handleSkipStep}
          finished={currentHintIndex === hints.length}
        />
      </div>
    </div>
  )
}
