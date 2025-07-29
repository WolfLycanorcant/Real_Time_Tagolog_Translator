import { logger } from '../utils/logger.js'
import { OllamaConnectionError } from '../middleware/errorHandler.js'

export class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
    this.model = process.env.OLLAMA_MODEL || 'sailor2:8b'
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  async translateText(text, sourceLanguage = 'tl', targetLanguage = 'en') {
    logger.info(`Translation request: "${text}" (${sourceLanguage} -> ${targetLanguage})`)
    
    const prompt = this.buildTranslationPrompt(text, sourceLanguage, targetLanguage)
    
    return await this.executeWithRetry(async () => {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 200,
            stop: ['\n\n', 'Human:', 'Assistant:']
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const translation = this.parseTranslationResponse(data.response)
      const confidence = this.calculateConfidence(text, translation)

      logger.info(`Translation successful: "${translation}" (confidence: ${confidence})`)
      
      return {
        translation,
        confidence,
        sourceLanguage,
        targetLanguage,
        model: this.model
      }
    })
  }

  buildTranslationPrompt(text, sourceLanguage, targetLanguage) {
    const sourceLang = sourceLanguage === 'tl' ? 'Tagalog/Filipino' : 'English'
    const targetLang = targetLanguage === 'en' ? 'English' : 'Tagalog/Filipino'
    
    return `You are a professional translator specializing in ${sourceLang} to ${targetLang} translation.

Instructions:
- Translate the following ${sourceLang} text to ${targetLang}
- Handle code-switching (Taglish) appropriately
- Preserve cultural context and meaning
- Provide only the translation, no explanations
- If the text is already in ${targetLang}, return it as-is

Text to translate: "${text}"

Translation:`
  }

  parseTranslationResponse(response) {
    if (!response) {
      throw new Error('Empty response from Ollama')
    }
    
    // Clean up the response
    let translation = response.trim()
    
    // Remove common prefixes that the model might add
    translation = translation.replace(/^Translation:\s*/i, '')
    translation = translation.replace(/^Answer:\s*/i, '')
    translation = translation.replace(/^Result:\s*/i, '')
    
    // Remove quotes if the entire response is quoted
    if (translation.startsWith('"') && translation.endsWith('"')) {
      translation = translation.slice(1, -1)
    }
    
    return translation.trim()
  }

  calculateConfidence(originalText, translation) {
    // Simple confidence calculation based on various factors
    let confidence = 0.8 // Base confidence
    
    // Reduce confidence if translation is too similar to original (might not have translated)
    const similarity = this.calculateSimilarity(originalText.toLowerCase(), translation.toLowerCase())
    if (similarity > 0.9) {
      confidence -= 0.2
    }
    
    // Reduce confidence if translation is much shorter or longer
    const lengthRatio = translation.length / originalText.length
    if (lengthRatio < 0.3 || lengthRatio > 3) {
      confidence -= 0.1
    }
    
    // Increase confidence if translation contains common English words (for tl->en)
    const commonEnglishWords = ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'will', 'would']
    const englishWordCount = commonEnglishWords.filter(word => 
      translation.toLowerCase().includes(word)
    ).length
    
    if (englishWordCount > 0) {
      confidence += Math.min(0.1, englishWordCount * 0.02)
    }
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  async executeWithRetry(requestFn) {
    let lastError
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        logger.warn(`Ollama request attempt ${attempt} failed:`, error.message)
        
        if (attempt < this.maxRetries && this.shouldRetry(error)) {
          await this.delay(this.retryDelay * attempt) // Exponential backoff
          continue
        }
        break
      }
    }
    
    // All retries failed
    throw new OllamaConnectionError(
      `Ollama service unavailable after ${this.maxRetries} attempts: ${lastError.message}`
    )
  }

  shouldRetry(error) {
    // Retry on connection errors, timeouts, 5xx errors
    return (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message.includes('fetch failed') ||
      (error.message.includes('500') || error.message.includes('502') || error.message.includes('503'))
    )
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      const modelExists = data.models?.some(model => model.name.includes(this.model))
      
      return {
        status: 'healthy',
        modelAvailable: modelExists,
        models: data.models?.map(m => m.name) || []
      }
    } catch (error) {
      logger.error('Ollama health check failed:', error.message)
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}