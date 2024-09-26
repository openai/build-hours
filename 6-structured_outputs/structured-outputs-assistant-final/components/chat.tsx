'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import Message from './message'
import { Spinner } from './ui/spinner' // Assuming Spinner is imported from somewhere
import ToolResults from './tool-results'

export interface MessageProps {
  content: string | React.ReactNode
  role: 'user' | 'agent' | 'assistant' | 'tool'
  hidden?: boolean
  [key: string]: any
}

interface ChatProps {
  messages: MessageProps[]
  onSendMessage: (message: string) => void
  loading: boolean
  tool: any
}

const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  loading,
  tool
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputMessage, setInputMessage] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex justify-center items-center size-full">
      <div className="flex grow flex-col h-full max-w-[700px] gap-2">
        <div className="flex-1 overflow-y-scroll px-4">
          <div className="space-y-1 pt-4">
            {messages.map((message, index) => (
              <React.Fragment key={index}>
                {message.role === 'tool' ? (
                  <>
                    {index === messages.length - 1 && loading ? (
                      <div className="h-[50vh] flex justify-center items-center w-full">
                        <Spinner />
                      </div>
                    ) : (
                      <ToolResults tool={message} />
                    )}
                  </>
                ) : (
                  <Message
                    view="user"
                    role={message.role === 'user' ? 'me' : 'other'}
                    content={message.content}
                  />
                )}
              </React.Fragment>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className=" p-4">
          <div className="flex items-center">
            <div className="flex w-full items-center">
              <div className="flex w-full flex-col gap-1.5 rounded-[26px] p-1.5 transition-colors bg-[#f4f4f4]">
                <div className="flex items-end gap-1.5 md:gap-2 pl-4">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <textarea
                      id="prompt-textarea"
                      tabIndex={0}
                      dir="auto"
                      rows={1}
                      placeholder="Send message"
                      className="m-0 resize-none border-0 focus:outline-none text-sm bg-transparent px-0 py-2 max-h-[20dvh]"
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          onSendMessage(inputMessage)
                          setInputMessage('')
                        }
                      }}
                    />
                  </div>
                  <button
                    disabled={!inputMessage}
                    data-testid="send-button"
                    className="mb-1 me-1 flex size-8 items-center justify-center rounded-full bg-black text-white transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:outline-black disabled:bg-[#D7D7D7] disabled:text-[#f4f4f4] disabled:hover:opacity-100"
                    onClick={() => {
                      onSendMessage(inputMessage)
                      setInputMessage('')
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      fill="none"
                      viewBox="0 0 32 32"
                      className="icon-2xl"
                    >
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0v-9.813l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
