import { useState, useEffect, useRef } from 'react'
import { Step, getSolution } from './actions'
import { evaluate, equal } from 'mathjs'

export const useSolution = ({
  problem,
  onSolutionFetched,
  onReset
}: {
  problem: string | null
  onSolutionFetched: (responseContent: any) => void
  onReset: () => void
}) => {
  const [loading, setLoading] = useState(false)
  const [hints, setHints] = useState<Step[]>([])
  const [currentHintIndex, setCurrentHintIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<
    (null | 'skipped' | 'success' | 'fail' | 'finished')[]
  >([])
  const hasFetched = useRef(false)

  useEffect(() => {
    if (problem && !hasFetched.current) {
      const fetchSolution = async () => {
        setLoading(true)
        setHints([])
        setFinalAnswer(null)
        setCurrentHintIndex(0)
        setUserAnswer('')
        setStatuses([])
        setRefusal(null)
        hasFetched.current = true // prevent multiple fetches

        try {
          const responseMessageContent = await getSolution(problem)
          console.log('Fetched solution:', responseMessageContent)

          if (
            !responseMessageContent ||
            (!responseMessageContent.steps && !responseMessageContent.refusal)
          ) {
            console.error(
              'Invalid responseMessageContent:',
              responseMessageContent
            )
            return
          }

          if (responseMessageContent.refusal) {
            setRefusal(responseMessageContent.refusal)
          } else {
            setHints(responseMessageContent.steps)
            setFinalAnswer(responseMessageContent.final_answer)
            setStatuses(
              new Array(responseMessageContent.steps.length).fill(null)
            )
            onSolutionFetched(responseMessageContent)
          }
        } catch (error) {
          console.error('Failed to fetch solution:', error)
        } finally {
          setLoading(false)
        }
      }

      fetchSolution()
    }
  }, [problem, onSolutionFetched])

  const handleSkipStep = () => {
    if (currentHintIndex >= hints.length) {
      onReset()
    } else {
      setStatuses(prevStatuses => {
        const newStatuses = [...prevStatuses]
        newStatuses[currentHintIndex] = 'skipped'
        return newStatuses
      })
      setCurrentHintIndex(currentHintIndex + 1)
      setUserAnswer('')
    }
  }

  const handleCheckAnswer = async () => {
    const normalizeAnswer = (answer: string) => {
      try {
        // Evaluate the mathematical expression to a standard form
        return evaluate(answer.replace(/\s+/g, ''))
      } catch {
        return answer.trim().toLowerCase()
      }
    }

    const compareAnswers = (input: string, output: string) => {
      const normalizedInput = normalizeAnswer(input)
      const normalizedOutput = normalizeAnswer(output)
      try {
        return equal(normalizedInput, normalizedOutput)
      } catch {
        return normalizedInput === normalizedOutput
      }
    }

    if (compareAnswers(userAnswer, finalAnswer || '')) {
      setStatuses(prevStatuses => {
        const newStatuses = [...prevStatuses]
        newStatuses[currentHintIndex] = 'success'
        newStatuses.fill('finished', currentHintIndex + 1)
        return newStatuses
      })
      setCurrentHintIndex(hints.length)
      setUserAnswer('')
    } else if (compareAnswers(userAnswer, hints[currentHintIndex].output)) {
      setStatuses(prevStatuses => {
        const newStatuses = [...prevStatuses]
        newStatuses[currentHintIndex] = 'success'
        return newStatuses
      })
      setCurrentHintIndex(index => index + 1)
      setUserAnswer('')
    } else {
      setStatuses(prevStatuses => {
        const newStatuses = [...prevStatuses]
        newStatuses[currentHintIndex] = 'fail'
        return newStatuses
      })
      setCurrentHintIndex(currentHintIndex + 1)
      setUserAnswer('')
    }
  }

  return {
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
  }
}
