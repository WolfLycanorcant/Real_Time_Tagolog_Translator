import express from 'express'
import dotenv from 'dotenv'
import helmet from 'helmet'
import morgan from 'morgan'
import { corsMiddleware, ngrokMiddleware } from './middleware/cors.js'
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'
import { OllamaService } from './services/ollamaService.js'
import { WhisperService } from './services/whisperService.js'
import multer from 'multer'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Initialize services
const ollamaService = new OllamaService()
const whisperService = new WhisperService()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  }
})

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Disable for development
}))

// Logging middleware
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}))

// CORS and tunnel support middleware
app.use(corsMiddleware)
app.use(ngrokMiddleware)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoints
app.get('/api/health', async (req, res) => {
  try {
    const ollamaHealth = await ollamaService.checkHealth()
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      ollama: ollamaHealth
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLanguage = 'tl', targetLanguage = 'en' } = req.body

    // Basic validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required for translation',
        timestamp: new Date().toISOString()
      })
    }

    if (text.length > 1000) {
      return res.status(400).json({
        error: 'Text too long (max 1000 characters)',
        timestamp: new Date().toISOString()
      })
    }

    // Translate using Ollama
    const result = await ollamaService.translateText(text, sourceLanguage, targetLanguage)
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Translation error:', error)
    
    // Return error with fallback suggestion
    res.status(500).json({
      error: 'Translation service unavailable',
      fallback: true,
      originalText: req.body.text,
      timestamp: new Date().toISOString()
    })
  }
})

// Ollama health check endpoint
app.get('/api/translate/health', async (req, res) => {
  try {
    const health = await ollamaService.checkHealth()
    res.json(health)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})

// Whisper transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Audio file is required',
        timestamp: new Date().toISOString()
      })
    }

    const { language = 'tl' } = req.body
    
    logger.info(`Transcribing audio file: ${req.file.originalname} (${req.file.size} bytes)`)

    // Transcribe using Faster-Whisper
    const result = await whisperService.transcribeAudio(req.file.buffer, language)
    
    res.json({
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      duration: result.duration,
      service: result.service,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Transcription error:', error)
    
    res.status(500).json({
      error: 'Transcription service unavailable',
      detail: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Real-time transcription endpoint
app.post('/api/transcribe-realtime', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Audio chunk is required',
        timestamp: new Date().toISOString()
      })
    }

    const { language = 'tl' } = req.body

    // Real-time transcription with Faster-Whisper
    const result = await whisperService.transcribeRealtimeChunk(req.file.buffer, language)
    
    res.json({
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      isFinal: result.isFinal,
      service: result.service,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Real-time transcription error:', error)
    
    res.status(500).json({
      error: 'Real-time transcription failed',
      detail: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Whisper health check endpoint
app.get('/api/whisper/health', async (req, res) => {
  try {
    const health = await whisperService.checkHealth()
    res.json(health)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      service: 'faster-whisper'
    })
  }
})

// Whisper models endpoint
app.get('/api/whisper/models', async (req, res) => {
  try {
    const models = await whisperService.getAvailableModels()
    res.json(models)
  } catch (error) {
    logger.error('Failed to get Whisper models:', error)
    res.status(500).json({
      error: 'Failed to get available models',
      detail: error.message
    })
  }
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(globalErrorHandler)

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Backend server running on http://0.0.0.0:${PORT}`)
  logger.info('📡 CORS configured for tunnel access')
  
  // Check Ollama connection on startup
  try {
    const health = await ollamaService.checkHealth()
    if (health.status === 'healthy') {
      logger.info(`✅ Ollama connected successfully (${health.models?.length || 0} models available)`)
      if (health.modelAvailable) {
        logger.info(`✅ sailor2:8b model is available`)
      } else {
        logger.warn(`⚠️  sailor2:8b model not found. Available models: ${health.models?.join(', ') || 'none'}`)
      }
    } else {
      logger.error(`❌ Ollama connection failed: ${health.error}`)
    }
  } catch (error) {
    logger.error('❌ Failed to check Ollama connection:', error.message)
  }
  
  logger.info('✅ Error handling framework initialized')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})