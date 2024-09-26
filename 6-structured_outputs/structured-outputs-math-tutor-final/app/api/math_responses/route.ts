import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const openai = new OpenAI()
const MODEL = 'gpt-4o-2024-08-06'
const MATH_TUTOR_PROMPT = `
You are a helpful math tutor. You will be provided with a math problem,
and your goal will be to output a step by step solution, along with a final answer.
Follow the provided schema so that the solution can be revealed to the user progressively.

The steps explanations should be detailed without revealing too much, i.e. the answer (step output) should not be included in the explanation.

The steps should also be significant enough, making real progress towards the final answer. 
For example, the 1st step could be to simplify the equation, the 2nd step could be to isolate the variable, etc.

The final answer should be the result of the math problem, in fraction form if applicable. 
For example, if the result is 1/2, the final answer should be 1/2 and not 0.5.

If the user input is not a clear math problem, you should not try to solve it and return an empty array of steps with a final answer of "N/A".
`

const Step = z.object({
  explanation: z.string(),
  output: z.string()
})

const MathReasoning = z.object({
  steps: z.array(Step),
  final_answer: z.string()
})

async function getMathSolution(question: string) {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: MATH_TUTOR_PROMPT },
      { role: 'user', content: question }
    ],
    response_format: zodResponseFormat(MathReasoning, 'math_reasoning')
  })

  if (completion.choices && completion.choices.length > 0) {
    return completion.choices[0].message
  } else {
    throw new Error('Failed to fetch solution')
  }
}

export async function POST(request: Request) {
  const { problem } = await request.json()

  try {
    const solution = await getMathSolution(problem)
    // Check for refusals in case the model refuses to fulfill the request due to safety reasons
    if (solution.refusal) {
      return new Response(
        JSON.stringify({ solution: null, refusal: solution.refusal }),
        {
          status: 200
        }
      )
    }
    return new Response(JSON.stringify({ solution: solution.parsed }), {
      status: 200
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'failed to fetch solution' }), {
      status: 500
    })
  }
}
