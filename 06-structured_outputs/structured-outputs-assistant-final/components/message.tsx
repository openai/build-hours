import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import './message.css'

interface MessageProps {
  view: 'agent' | 'user'
  role: 'me' | 'other'
  content: string | React.ReactNode
  loading?: boolean
}

const Message: React.FC<MessageProps> = ({
  view,
  role,
  content,
  loading = false
}) => {
  return (
    <div className="text-sm">
      {role === 'me' ? (
        <div className="flex justify-end">
          <div>
            <div className="my-2 flex justify-end text-xs text-zinc-400 font-bold">
              Me
            </div>
            <div className="ml-4 rounded-lg rounded-br-none bg-zinc-200 p-4 text-zinc-900 md:ml-24">
              {loading ? (
                <div className="flex justify-center">
                  <div className="dot bg-zinc-700" />
                  <div className="dot bg-zinc-700" />
                  <div className="dot bg-zinc-700" />
                </div>
              ) : (
                <div>
                  <div>
                    <ReactMarkdown>{content as string}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="my-2 text-xs text-zinc-400 font-bold">
            {view === 'agent' ? 'User' : 'Assistant'}
          </div>
          <div className="flex">
            <div className="mr-4 rounded-lg rounded-bl-none p-4 text-white md:mr-24 bg-black">
              {loading ? (
                <div className="flex justify-center">
                  <div className="dot bg-white" />
                  <div className="dot bg-white" />
                  <div className="dot bg-white" />
                </div>
              ) : (
                <div>
                  <ReactMarkdown>{content as string}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Message
