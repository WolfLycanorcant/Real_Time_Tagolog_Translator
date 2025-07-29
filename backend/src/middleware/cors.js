import { logger } from '../utils/logger.js'

export const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin
  
  // Comprehensive list of allowed origins for tunnel support
  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
    process.env.TUNNEL_URL, // Dynamic tunnel URL from env
    /^https:\/\/.*\.ngrok\.dev$/,
    /^https:\/\/.*\.ngrok\.io$/,
    /^https:\/\/.*\.ngrok-free\.app$/,
    /^https:\/\/.*\.cloudflare\.com$/,
    /^https:\/\/.*\.trycloudflare\.com$/,
    /^https:\/\/.*\.loca\.lt$/,
    /^https:\/\/.*\.serveo\.net$/
  ].filter(Boolean)

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') return allowed === origin
    if (allowed instanceof RegExp) return allowed.test(origin)
    return false
  })

  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*')
    logger.debug(`CORS: Allowed origin ${origin}`)
  } else {
    logger.warn(`CORS: Blocked origin ${origin}`)
  }

  // Set comprehensive CORS headers
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Max-Age', '86400') // 24 hours
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug(`CORS: Handling preflight for ${req.url}`)
    res.sendStatus(200)
  } else {
    next()
  }
}

// Middleware to add ngrok headers
export const ngrokMiddleware = (req, res, next) => {
  // Add ngrok skip browser warning header
  res.header('ngrok-skip-browser-warning', 'true')
  next()
}