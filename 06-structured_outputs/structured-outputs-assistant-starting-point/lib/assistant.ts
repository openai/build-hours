export const SYSTEM_PROMPT = `
You are a product recommendation assistant, assisting users in discovering products that match their preferences.
When users ask for help finding products, you can search for matches using the search_product tool.
When you have found matches, you can display the top 3 most relevant using the generate_ui tool.

If users ask about something that can be displayed with data, use the generate_ui tool with the appropriate component.
When users express interest in a specific product, add it to the cart.

Feel free to ask follow up questions when needed.
`

export interface Message {
  role: 'system' | 'assistant' | 'user' | 'tool'
  content: string
  [key: string]: any
}

export interface Product {
  id: string
  title: string
  url: string
  primary_image: string
  price: string
  categories: string[]
  color: string
  style: string
}

export const handleTool = async (toolName: string, parameters: any) => {
  console.log('Handle tool', toolName, parameters)
}

export const handleTurn = async (messages: Message[]) => {
  console.log('Handle turn', messages)
  try {
    const response = await fetch('/api/assistant/turn_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    })
    const result = await response.json()
    console.log(result)
    return result
  } catch (error) {
    console.error('Error handling turn:', error)
    return error
  }
}
