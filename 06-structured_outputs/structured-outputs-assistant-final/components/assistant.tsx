import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { handleTool, handleTurn, Message, SYSTEM_PROMPT } from '@/lib/assistant'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Spinner } from './ui/spinner'
import ToolResults from './tool-results'
import Chat from './chat'
import { CartItem } from './cart'

interface AssistantProps {
  cart: CartItem[]
  setCart: (items: CartItem[]) => void
}

const Assistant: React.FC<AssistantProps> = ({
  cart,
  setCart
}: AssistantProps) => {
  const [inputMessage, setInputMessage] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<any[]>([]) // New state for tracking chat messages
  const [messages, setMessages] = useState<any[]>([])
  const [tool, setTool] = useState<Tool | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const processMessages = useCallback(async (currentMessages: Message[]) => {
    setLoading(true)
    console.log('send message', currentMessages)
    try {
      const response = await handleTurn(currentMessages)
      console.log('response', response)
      if (response.tool_calls[0].function) {
        const toolName = response.tool_calls[0].function.name
        const args = JSON.parse(response.tool_calls[0].function.arguments)
        const toolCallResult = await handleTool(toolName, args)

        if (toolName === 'add_to_cart') {
          setCart([...toolCallResult.cartItems])
        }

        setTool({
          name: toolName,
          content: toolCallResult
        })

        const updatedMessages = [
          ...currentMessages,
          { ...response },
          {
            name: toolName,
            role: 'tool',
            tool_call_id: response.tool_calls[0].id,
            content: JSON.stringify(toolCallResult)
          }
        ]

        setMessages(updatedMessages)
        setChatMessages(prevChatMessages => [
          ...prevChatMessages,
          {
            role: 'tool',
            name: toolName,
            content: toolCallResult
          }
        ])

        await processMessages(updatedMessages)
      } else {
        // Handle assistant response without tool calls
        const updatedMessages = [...currentMessages, response]
        setMessages(updatedMessages)

        setChatMessages(prevChatMessages => [
          ...prevChatMessages,
          { role: 'assistant', content: response.content }
        ])
      }
    } catch (error) {
      console.error('Error processing message:', error)
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content:
            'There was an error processing your request. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSendMessage = useCallback(
    async (message: string) => {
      console.log('inputMessage', message)
      if (!message.trim()) return

      const newMessages = [...messages]

      if (newMessages.length === 0) {
        newMessages.push({ role: 'system', content: SYSTEM_PROMPT })
      }

      newMessages.push({
        role: 'user',
        content: `USER INPUT: ${message.trim()}\n\nCURRENT CART: ${JSON.stringify(
          cart
        )}`
      })

      setMessages(newMessages)
      setChatMessages(prevChatMessages => [
        ...prevChatMessages,
        { role: 'user', content: message.trim() }
      ])

      setInputMessage('')

      await processMessages(newMessages)
    },
    [inputMessage, messages, processMessages]
  )

  return (
    <div className="p-4 w-full h-screen">
      <Chat
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        tool={tool}
        loading={loading}
      />
    </div>
  )
}

export default Assistant
