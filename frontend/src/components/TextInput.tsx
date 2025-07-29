import React, { useState } from 'react'
import { Send, Type } from 'lucide-react'

interface TextInputProps {
  onTranslate: (text: string) => void
  isLoading: boolean
  disabled?: boolean
}

export const TextInput: React.FC<TextInputProps> = ({
  onTranslate,
  isLoading,
  disabled = false
}) => {
  const [inputText, setInputText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim() && !isLoading && !disabled) {
      onTranslate(inputText.trim())
      setInputText('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Type className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Manual Input</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tagalog-input" className="block text-sm font-medium text-gray-700 mb-2">
            Type in Tagalog:
          </label>
          <textarea
            id="tagalog-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your Tagalog text here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            disabled={disabled}
          />
        </div>
        
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || disabled}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Translate</span>
            </>
          )}
        </button>
      </form>
      
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to translate, or Shift+Enter for new line
      </p>
    </div>
  )
}