import { useState, useEffect, useRef } from 'react'
import { Step, getSolution } from './actions'
import {
  equal,
  isConstantNode,
  isFunctionNode,
  isOperatorNode,
  isParenthesisNode,
  isSymbolNode,
  parse
} from 'mathjs'

// Answers can be equivalent arithmetic expressions or a literal line of algebra.
const answerFunctions = new Set([
  'abs',
  'acos',
  'asin',
  'atan',
  'atan2',
  'cbrt',
  'ceil',
  'cos',
  'exp',
  'floor',
  'gcd',
  'hypot',
  'lcm',
  'log',
  'log10',
  'max',
  'min',
  'pow',
  'round',
  'sin',
  'sqrt',
  'tan'
])
const answerOperators = new Set(['+', '-', '*', '/', '^', '%', '!'])

function normalizeAnswer(answer: string) {
  const literal = answer.trim().toLowerCase()
  try {
    // A simple equation such as x = 1/2 is checked by its right-hand value.
    const text = answer.replace(/\s+/g, '').replace(/^[a-zA-Z]=(?![=])/, '')
    const expression = parse(text)
    const unsupported = expression.filter((node, path, parent) => {
      if (isConstantNode(node)) return typeof node.value !== 'number'
      if (isParenthesisNode(node)) return false
      if (isOperatorNode(node)) return !answerOperators.has(node.op)
      if (isFunctionNode(node))
        return !isSymbolNode(node.fn) || !answerFunctions.has(node.fn.name)
      if (isSymbolNode(node))
        return (
          !(path === 'fn' && isFunctionNode(parent)) &&
          !['pi', 'e'].includes(node.name)
        )
      return true
    })
    return unsupported.length ? literal : expression.evaluate()
  } catch {
    return literal
  }
}

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
