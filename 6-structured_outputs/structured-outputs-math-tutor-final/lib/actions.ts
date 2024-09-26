export type Step = {
  explanation: string
  output: string
}

export type Solution = {
  steps: Step[]
  final_answer: string
  refusal?: string
}

export async function getSolution(problem: string): Promise<Solution> {
  const response = await fetch('/api/math_responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ problem })
  })

  console.log(response)

  if (!response.ok) {
    const errorMessage = await response.text() // Get the HTML error message
    console.error('Error:', errorMessage)
    throw new Error(errorMessage || 'Failed to fetch solution')
  }

  const data = await response.json()

  if (!data.refusal) {
    const result = data.solution

    const steps: Step[] = result.steps.map((step: any) => ({
      explanation: step.explanation,
      output: step.output
    }))

    const solution: Solution = {
      steps: steps,
      final_answer: result.final_answer
    }

    return solution
  } else {
    return { steps: [], final_answer: '', refusal: data.refusal }
  }
}
