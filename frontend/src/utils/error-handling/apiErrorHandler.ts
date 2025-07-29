export class APIErrorHandler {
  private retryAttempts = new Map<string, number>()
  private maxRetries = 3
  private retryDelay = 1000

  async handleRequest<T>(
    requestFn: () => Promise<T>,
    options: {
      endpoint: string
      fallback?: () => T
      skipRetry?: boolean
    }
  ): Promise<T> {
    const { endpoint, fallback, skipRetry = false } = options
    
    try {
      return await this.executeWithRetry(requestFn, endpoint, skipRetry)
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      
      // Log the error
      this.logAPIError(error, endpoint)
      
      // Attempt fallback
      if (fallback) {
        console.warn(`Using fallback for ${endpoint}`)
        return fallback()
      }
      
      // Transform error for user consumption
      throw this.transformError(error, endpoint)
    }
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    endpoint: string,
    skipRetry: boolean
  ): Promise<T> {
    const attempts = this.retryAttempts.get(endpoint) || 0
    
    try {
      const result = await requestFn()
      this.retryAttempts.delete(endpoint) // Reset on success
      return result
    } catch (error) {
      if (skipRetry || attempts >= this.maxRetries) {
        throw error
      }
      
      if (this.shouldRetry(error)) {
        this.retryAttempts.set(endpoint, attempts + 1)
        console.log(`Retrying ${endpoint} (attempt ${attempts + 1}/${this.maxRetries})`)
        await this.delay(this.retryDelay * Math.pow(2, attempts))
        return this.executeWithRetry(requestFn, endpoint, skipRetry)
      }
      
      throw error
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, 5xx errors, timeouts
    return (
      error.name === 'NetworkError' ||
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('fetch failed') ||
      error.message?.includes('Failed to fetch') ||
      (error.status >= 500 && error.status < 600) ||
      error.name === 'TimeoutError'
    )
  }

  private transformError(error: any, endpoint: string): Error {
    if (error.status === 404) {
      return new Error(`Service not available: ${endpoint}`)
    }
    if (error.status === 400) {
      return new Error('Invalid request - please check your input')
    }
    if (error.status >= 500) {
      return new Error('Server error - please try again later')
    }
    if (error.name === 'NetworkError' || error.message?.includes('fetch failed')) {
      return new Error('Network connection failed - check your internet connection')
    }
    if (error.message?.includes('CORS')) {
      return new Error('Connection blocked - please check tunnel configuration')
    }
    return new Error(`Request failed: ${error.message || 'Unknown error'}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logAPIError(error: any, endpoint: string) {
    const errorLog = {
      endpoint,
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }
    console.error('API Error:', errorLog)
    
    // Store in localStorage for debugging
    const existingErrors = JSON.parse(localStorage.getItem('apiErrors') || '[]')
    existingErrors.push(errorLog)
    // Keep only last 10 errors
    if (existingErrors.length > 10) {
      existingErrors.splice(0, existingErrors.length - 10)
    }
    localStorage.setItem('apiErrors', JSON.stringify(existingErrors))
  }

  // Method to clear retry attempts (useful for manual retry)
  clearRetryAttempts(endpoint?: string) {
    if (endpoint) {
      this.retryAttempts.delete(endpoint)
    } else {
      this.retryAttempts.clear()
    }
  }

  // Method to get retry status
  getRetryStatus(endpoint: string) {
    return {
      attempts: this.retryAttempts.get(endpoint) || 0,
      maxRetries: this.maxRetries,
      canRetry: (this.retryAttempts.get(endpoint) || 0) < this.maxRetries
    }
  }
}

// Global instance
export const apiErrorHandler = new APIErrorHandler()