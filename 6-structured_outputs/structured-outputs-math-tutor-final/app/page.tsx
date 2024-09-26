'use client'

import { ProblemCard } from '@/components/problem-card'
import { Solution } from '@/components/solution'
import { Sidebar } from '@/components/sidebar'
import { IconSidebar } from '@/components/ui/icons'
import React, { useState, useCallback } from 'react'

const Home = () => {
  const [input, setInput] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [responseMessageContent, setResponseMessageContent] = useState(null)
  const [solutionFetched, setSolutionFetched] = useState(false)

  const handleNewProblem = (message: string) => {
    setProblem(message)
    setIsSubmitted(true)
    setSolutionFetched(false)
  }

  const handleReset = () => {
    setProblem(null)
    setInput('')
    setIsSubmitted(false)
    setResponseMessageContent(null)
    setSolutionFetched(false)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSolutionFetched = useCallback((responseContent: any) => {
    setSolutionFetched(true)
    setResponseMessageContent(responseContent)
  }, [])

  return (
    <div className="flex h-full">
      <div className="relative grow flex h-full flex-col justify-between items-center transition-all duration-500">
        {responseMessageContent && (
          <div className="absolute top-4 right-4 z-50">
            <IconSidebar
              onClick={toggleSidebar}
              className="size-6 cursor-pointer"
            />
          </div>
        )}
        <ProblemCard
          input={input}
          setInput={setInput}
          onSubmit={handleNewProblem}
          problem={problem}
          onRestart={handleReset}
          isSubmitted={isSubmitted}
        />
        {isSubmitted && (
          <Solution
            problem={problem}
            onReset={handleReset}
            onSolutionFetched={handleSolutionFetched}
          />
        )}
      </div>
      {responseMessageContent && (
        <Sidebar isOpen={isSidebarOpen} response={responseMessageContent} />
      )}
    </div>
  )
}

export default Home
