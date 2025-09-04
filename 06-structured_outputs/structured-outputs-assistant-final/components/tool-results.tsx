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
          case 'search_products':
            return (
              <div className="flex justify-start mt-2">
                <div className="border flex items-center p-4 border-black text-black rounded-md">
                  {tool.content.matches.length} matches found.
                </div>
              </div>
            )
          case 'add_to_cart':
            return (
              <div className="flex justify-start mt-2">
                <div className="border flex items-center p-4 border-black text-black rounded-md">
                  <CircleCheckBig size={24} className="text-neutral-700 mr-2" />
                  <div>Items added to cart</div>
                </div>
              </div>
            )
          case 'generate_ui':
            return (
              <div className="w-full mt-8">
                {getComponent(tool.content.component) ?? ''}
              </div>
            )
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
