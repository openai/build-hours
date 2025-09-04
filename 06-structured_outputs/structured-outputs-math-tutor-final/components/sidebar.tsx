import * as React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coldarkDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface SidebarProps {
  isOpen: boolean
  response: any
}

export function Sidebar({ isOpen, response }: SidebarProps) {
  return (
    <div
      className={`h-full bg-neutral-200 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'hidden translate-x-full'
      } z-40 w-full sm:w-1/4 p-4`}
    >
      <h2 className="text-xl text-neutral-600">JSON Response</h2>

      <div className="mt-8 bg-neutral-800 rounded-md h-4/5 overflow-y-scroll">
        <SyntaxHighlighter
          language="json"
          PreTag="div"
          style={coldarkDark}
          showLineNumbers
          customStyle={{
            margin: 0,
            width: '100%',
            background: 'transparent',
            padding: '1.5rem 1rem'
          }}
          lineNumberStyle={{
            userSelect: 'none'
          }}
          codeTagProps={{
            style: {
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)'
            }
          }}
        >
          {JSON.stringify(response, null, 2)}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
