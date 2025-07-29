import { logger } from '../utils/logger.js'

export class WhisperService {
  constructor() {
    this.baseUrl = process.env.WHISPER_URL || 'http://localhost:8000'
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  async transcribeAudio(audioBuffer, language = 'tl') {
    logger.info(`Transcribing audio with Faster-Whisper (language: ${language})`)
    
    return await this.executeWithRetry(async () => {
      const formData = new FormData()
      
      // Create a blob from the audio buffer
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
      formData.append('audio_file', audioBlob, 'audio.wav')
      formData.append('language', language)

      const response = await fetch(`${this.baseUrl}/transcribe`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Whisper API error: ${response.status} - ${errorData.detail || response.statusText}`)
      }

      const result = await response.json()
      
      logger.info(`Transcription successful: "${result.text}" (confidence: ${result.confidence})`)
      
      return {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
        service: 'faster-whisper'
      }
    })
  }

  async transcribeRealtimeChunk(audioBuffer, language = 'tl') {
    logger.info(`Real-time transcription with Faster-Whisper`)
    
    try {
      const formData = new FormData()
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
      formData.append('audio_chunk', audioBlob, 'chunk.wav')
      formData.append('language', language)

      const response = await fetch(`${this.baseUrl}/transcribe-realtime`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Whisper realtime API error: ${response.status} - ${errorData.detail || response.statusText}`)
      }

      const result = await response.json()
      
      return {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        isFinal: result.is_final,
        service: 'faster-whisper-realtime'
      }
    } catch (error) {
      logger.error('Real-time transcription failed:', error.message)
      throw error
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        status: data.status,
        modelLoaded: data.model_loaded,
        modelSize: data.model_size,
        device: data.device,
        service: 'faster-whisper'
      }
    } catch (error) {
      logger.error('Whisper health check failed:', error.message)
      return {
        status: 'unhealthy',
        error: error.message,
        service: 'faster-whisper'
      }
    }
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Models API error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      logger.error('Failed to get available models:', error.message)
      throw error
    }
  }

  async executeWithRetry(requestFn) {
    let lastError
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        logger.warn(`Whisper request attempt ${attempt} failed:`, error.message)
        
        if (attempt < this.maxRetries && this.shouldRetry(error)) {
          await this.delay(this.retryDelay * attempt) // Exponential backoff
          continue
        }
        break
      }
    }
    
    // All retries failed
    throw new Error(`Whisper service unavailable after ${this.maxRetries} attempts: ${lastError.message}`)
  }

  shouldRetry(error) {
    // Retry on connection errors, timeouts, 5xx errors
    return (
      error.message.includes('fetch failed') ||
      error.message.includes('500') || 
      error.message.includes('502') || 
      error.message.includes('503') ||
      error.message.includes('504')
    )
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}