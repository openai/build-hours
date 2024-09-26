import * as React from 'react'
import { IconArrowRight } from '@/components/ui/icons'
import { useRef, type RefObject } from 'react'
import { useRouter } from 'next/navigation'

function useEnterSubmit<T extends HTMLElement>(): {
  formRef: RefObject<HTMLFormElement>
  onKeyDown: (event: React.KeyboardEvent<T>) => void
} {
  const formRef = useRef<HTMLFormElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent<T>): void => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      formRef.current?.requestSubmit()
      event.preventDefault()
    }
  }

  return { formRef, onKeyDown: handleKeyDown }
}

interface PromptFormProps {
  input: string
  placeholder: string
  mode?: string
  setInput: (value: string) => void
  onSubmit: (message: string) => void
}

export function PromptForm({
  input,
  placeholder,
  mode = 'input',
  setInput,
  onSubmit
}: PromptFormProps) {
  const router = useRouter()
  const { formRef, onKeyDown } = useEnterSubmit<HTMLInputElement>()
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() !== '') {
      await onSubmit(input)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div
        className={`flex justify-between overflow-hidden rounded-full border border-neutral-100 ${mode === 'step' ? 'bg-neutral-100 px-1' : 'bg-white shadow-lg px-2'}`}
      >
        <input
          ref={inputRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`font-mono bg-transparent focus-within:outline-none text-sm ${mode === 'step' ? 'px-1.5 py-1' : 'px-2 py-2.5'}`}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          name="message"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={input === ''}
          className={`bg-black p-1.5 rounded-full ${mode === 'step' ? 'my-1' : 'my-2 mr-1'}`}
        >
          <IconArrowRight className="size-4 text-white" />
          <span className="sr-only">Send message</span>
        </button>
      </div>
    </form>
  )
}
