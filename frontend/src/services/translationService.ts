import { apiErrorHandler } from '../utils/error-handling/apiErrorHandler'

export interface TranslationResult {
  translation: string
  confidence: number
  sourceLanguage: string
  targetLanguage: string
  model: string
  timestamp: string
}

export interface TranslationError {
  error: string
  fallback?: boolean
  originalText?: string
  timestamp: string
}

export const translateWithOllama = async (text: string): Promise<TranslationResult> => {
  return await apiErrorHandler.handleRequest(
    async () => {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          text: text.trim(), 
          sourceLanguage: 'tl', 
          targetLanguage: 'en' 
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      return result
    },
    {
      endpoint: '/api/translate',
      fallback: () => ({
        translation: `[Fallback] ${text}`,
        confidence: 0.3,
        sourceLanguage: 'tl',
        targetLanguage: 'en',
        model: 'fallback',
        timestamp: new Date().toISOString()
      })
    }
  )
}

// Basic Tagalog dictionary fallback
const basicTagalogDictionary: Record<string, string> = {
  // Greetings
  'kumusta': 'how are you',
  'magandang umaga': 'good morning',
  'magandang hapon': 'good afternoon',
  'magandang gabi': 'good evening',
  
  // Common responses
  'salamat': 'thank you',
  'walang anuman': 'you\'re welcome',
  'oo': 'yes',
  'hindi': 'no',
  'pwede': 'can/possible',
  'ayaw': 'don\'t want',
  
  // Basic verbs
  'kain': 'eat',
  'inom': 'drink',
  'tulog': 'sleep',
  'gising': 'wake up',
  'lakad': 'walk',
  'takbo': 'run',
  
  // Family
  'pamilya': 'family',
  'nanay': 'mother',
  'tatay': 'father',
  'kapatid': 'sibling',
  'anak': 'child',
  
  // Common objects
  'tubig': 'water',
  'pagkain': 'food',
  'bahay': 'house',
  'kotse': 'car',
  'pera': 'money',
  
  // Time
  'ngayon': 'now',
  'bukas': 'tomorrow',
  'kahapon': 'yesterday',
  'araw': 'day',
  'gabi': 'night',
  
  // Common phrases
  'sige na': 'come on/okay',
  'tara na': 'let\'s go',
  'sandali lang': 'just a moment',
  'paano': 'how',
  'saan': 'where',
  'kailan': 'when',
  'bakit': 'why',
  'ano': 'what'
}

export const basicTagalogTranslation = (text: string): string => {
  let translated = text.toLowerCase()
  
  // Sort by length (longest first) for better matching
  const entries = Object.entries(basicTagalogDictionary)
    .sort(([a], [b]) => b.length - a.length)
  
  entries.forEach(([tagalog, english]) => {
    const regex = new RegExp(`\\b${tagalog}\\b`, 'gi')
    translated = translated.replace(regex, english)
  })
  
  // Capitalize first letter
  return translated.charAt(0).toUpperCase() + translated.slice(1)
}