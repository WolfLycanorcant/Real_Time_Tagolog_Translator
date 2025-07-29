import { logger } from '../utils/logger.js'

// Custom error classes
export class OllamaConnectionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OllamaConnectionError'
    this.status = 503
  }
}

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'ValidationError'
    this.status = 400
    this.details = details
  }
}

// Global error handler middleware
export const globalErrorHandler = (err, req, res, next) => {
  // Log the error with context
  logger.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    body: req.body
  })

  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(err.status || 400).json({
      error: 'Invalid request data',
      details: err.details || (isDevelopment ? err.message : undefined),
      timestamp: new Date().toISOString()
    })
  }

  if (err.name === 'OllamaConnectionError') {
    return res.status(503).json({
      error: 'Translation service temporarily unavailable',
      fallback: true,
      retryAfter: 30,
      timestamp: new Date().toISOString()
    })
  }

  // Handle connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Service unavailable',
      fallback: true,
      timestamp: new Date().toISOString()
    })
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      error: 'Request timeout',
      fallback: true,
      timestamp: new Date().toISOString()
    })
  }

  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      timestamp: new Date().toISOString()
    })
  }

  // Default error response
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: isDevelopment ? err.message : 'Internal server error',
    stack: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  })
}

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 404 handler
export const notFoundHandler = (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.url}`)
  res.status(404).json({
    error: 'Route not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })
}