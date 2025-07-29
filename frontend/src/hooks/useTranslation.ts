import { useState, useCallback } from 'react'
import { translateWithOllama, basicTagalogTranslation, TranslationResult } from '../services/translationService'

export interface TranslationHistoryItem {
  id: string
  originalText: string
  translation: string
  confidence: number
  timestamp: string
  model: string
}

interface UseTranslationReturn {
  translation: string
  isLoading: boolean
  error: string | null
  confidence: number
  history: TranslationHistoryItem[]
  translateText: (text: string) => Promise<void>
  clearHistory: () => void
  clearError: () => void
}

export const useTranslation = (): UseTranslationReturn => {
  const [translation, setTranslation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [history, setHistory] = useState<TranslationHistoryItem[]>([])

  const translateText = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      setError('Please provide text to translate')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Translating: "${text}"`)
      
      // Try Ollama translation first
      const result: TranslationResult = await translateWithOllama(text)
      
      setTranslation(result.translation)
      setConfidence(result.confidence)
      
      // Add to history
      const historyItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        originalText: text,
        translation: result.translation,
        confidence: result.confidence,
        timestamp: result.timestamp,
        model: result.model
      }
      
      setHistory(prev => [historyItem, ...prev].slice(0, 50)) // Keep last 50 translations
      
      console.log(`Translation successful: "${result.translation}" (confidence: ${result.confidence})`)
      
    } catch (err) {
      console.error('Translation failed:', err)
      setError(err instanceof Error ? err.message : 'Translation failed')
      
      // Try fallback dictionary translation
      try {
        const fallbackTranslation = basicTagalogTranslation(text)
        setTranslation(fallbackTranslation)
        setConfidence(0.4) // Lower confidence for fallback
        
        // Add fallback to history
        const fallbackHistoryItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          originalText: text,
          translation: fallbackTranslation,
          confidence: 0.4,
          timestamp: new Date().toISOString(),
          model: 'fallback-dictionary'
        }
        
        setHistory(prev => [fallbackHistoryItem, ...prev].slice(0, 50))
        
        console.log(`Using fallback translation: "${fallbackTranslation}"`)
        
      } catch (fallbackErr) {
        console.error('Fallback translation also failed:', fallbackErr)
        setTranslation('')
        setConfidence(0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    translation,
    isLoading,
    error,
    confidence,
    history,
    translateText,
    clearHistory,
    clearError
  }
}