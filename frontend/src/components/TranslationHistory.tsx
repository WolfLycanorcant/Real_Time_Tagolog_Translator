import React from 'react'
import { Clock, Trash2, Volume2 } from 'lucide-react'
import { TranslationHistoryItem } from '../hooks/useTranslation'

interface TranslationHistoryProps {
  history: TranslationHistoryItem[]
  onClearHistory: () => void
}

export const TranslationHistory: React.FC<TranslationHistoryProps> = ({
  history,
  onClearHistory
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getModelBadgeColor = (model: string) => {
    if (model.includes('sailor2')) return 'bg-blue-100 text-blue-800'
    if (model === 'fallback-dictionary') return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

  if (history.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Translation History</h3>
        </div>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No translations yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Start speaking to see your translation history here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Translation History ({history.length})
        </h3>
        <button
          onClick={onClearHistory}
          className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            {/* Header with time and confidence */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {formatTime(item.timestamp)}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getModelBadgeColor(item.model)}`}>
                  {item.model === 'sailor2:8b' ? 'AI' : 
                   item.model === 'fallback-dictionary' ? 'Dictionary' : 
                   item.model}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(item.confidence)}`}>
                  {Math.round(item.confidence * 100)}% confidence
                </span>
                <button
                  onClick={() => speakText(item.translation)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Listen to translation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Original text */}
            <div className="mb-2">
              <p className="text-sm text-gray-600 mb-1">Tagalog:</p>
              <p className="text-gray-900 bg-gray-100 rounded p-2 text-sm">
                "{item.originalText}"
              </p>
            </div>
            
            {/* Translation */}
            <div>
              <p className="text-sm text-gray-600 mb-1">English:</p>
              <p className="text-gray-900 bg-blue-50 rounded p-2 text-sm font-medium">
                "{item.translation}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}