import OpenAI from 'openai'
const openai = new OpenAI()
import { tools } from '../../../../lib/tools'
import { ChatCompletionTool } from 'openai/resources/chat/completions'

export async function POST(request: Request) {
  const { messages } = await request.json()

  try {
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages,
      temperature: 0,
      tools: tools as ChatCompletionTool[],
      parallel_tool_calls: false
    })

    if (response.choices.length > 0) {
      console.log('Response:', response.choices[0].message)
      if (response.choices[0].tool_calls) {
        console.log('Tool call:', response.choices[0].tool_calls[0].function)
      }
      return new Response(JSON.stringify(response.choices[0].message), {
        status: 200
      })
    }
    return new Response(
      JSON.stringify({
        text: 'I am sorry, there was an error processing your message. Please try again.'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify(error), { status: 500 })
  }
}
