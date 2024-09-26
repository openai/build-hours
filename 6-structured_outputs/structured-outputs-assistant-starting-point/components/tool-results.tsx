import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import Image from 'next/image'

import { DialogDescription } from '@radix-ui/react-dialog'
import { Card, CardContent, CardHeader } from './ui/card'
import { CircleCheckBig } from 'lucide-react'
import { getComponent } from '@/lib/components-mapping'
import { Test } from './test'
import Flow from './workflow'

interface ToolResultsProps {
  tool: {
    name: string
    content: any
  }
}

const ToolResults: React.FC<ToolResultsProps> = ({
  tool
}: ToolResultsProps) => {
  return (
    <div className="flex justify-start mt-6">
      {(() => {
        switch (tool.name) {
          default:
            return (
              <div className="bg-white rounded-md p-4 my-6">
                <h2>{tool.name}</h2>
                <div className="mt-4 p-4 bg-black overflow-y-scroll max-h-96 text-white font-mono">
                  {JSON.stringify(tool.content)}
                </div>
              </div>
            )
        }
      })()}
    </div>
  )
}

export default ToolResults
