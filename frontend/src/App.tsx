import React, { useState, useEffect } from 'react'
import { Globe, Wifi, WifiOff, AlertTriangle, Languages } from 'lucide-react'
import { MicrophoneButton } from './components/MicrophoneButton'
import { WhisperMicrophoneButton } from './components/WhisperMicrophoneButton'
import { TranslationHistory } from './components/TranslationHistory'
import { TextInput } from './components/TextInput'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useWhisperRecognition } from './hooks/useWhisperRecognition'
import { useTranslation } from './hooks/useTranslation'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [whisperStatus, setWhisperStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [useWhisper, setUseWhisper] = useState(true) // Toggle between Web Speech API and Faster-Whisper

  // Web Speech API hook (fallback)
  const {
    transcript: webTranscript,
    isListening: webIsListening,
    isSupported: speechSupported,
    error: speechError,
    startListening: webStartListening,
    stopListening: webStopListening,
    resetTranscript: webResetTranscript
  } = useSpeechRecognition()

  // Faster-Whisper hook (primary)
  const {
    transcript: whisperTranscript,
    isRecording,
    isProcessing,
    isSupported: whisperSupported,
    error: whisperError,
    confidence: whisperConfidence,
    startRecording,
    stopRecording,
    resetTranscript: whisperResetTranscript
  } = useWhisperRecognition()

  // Use appropriate values based on selected method
  const transcript = useWhisper ? whisperTranscript : webTranscript
  const isListening = useWhisper ? (isRecording || isProcessing) : webIsListening
  const isSupported = useWhisper ? whisperSupported : speechSupported
  const error = useWhisper ? whisperError : speechError
  const startListening = useWhisper ? startRecording : webStartListening
  const stopListening = useWhisper ? stopRecording : webStopListening
  const resetTranscript = useWhisper ? whisperResetTranscript : webResetTranscript

  // Translation hook
  const {
    translation,
    isLoading: translationLoading,
    error: translationError,
    confidence,
    history,
    translateText,
    clearHistory,
    clearError
  } = useTranslation()

  useEffect(() => {
    // Network status monitoring
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check backend and Ollama status
    checkServices()
    
    // Set up periodic health checks
    const interval = setInterval(checkServices, 30000) // Every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  // Handle speech recognition results
  useEffect(() => {
    if (transcript && transcript.trim() !== currentTranscript) {
      setCurrentTranscript(transcript.trim())
      
      // Auto-translate when speech stops (transcript is final)
      if (!isListening && transcript.trim().length > 0) {
        translateText(transcript.trim())
        resetTranscript()
        setCurrentTranscript('')
      }
    }
  }, [transcript, isListening, currentTranscript, translateText, resetTranscript])

  const checkServices = async () => {
    // Check backend
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      setBackendStatus(response.ok ? 'online' : 'offline')
    } catch {
      setBackendStatus('offline')
    }

    // Check Ollama through backend
    try {
      const response = await fetch('/api/translate/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      setOllamaStatus(response.ok ? 'online' : 'offline')
    } catch {
      setOllamaStatus('offline')
    }

    // Check Whisper service
    try {
      const response = await fetch('/api/whisper/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      setWhisperStatus(response.ok ? 'online' : 'offline')
    } catch {
      setWhisperStatus('offline')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />
      default:
        return <div className="spinner" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Offline'
      default:
        return 'Checking...'
    }
  }

  const handleStartListening = () => {
    clearError()
    startListening()
  }

  const handleStopListening = () => {
    stopListening()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Globe className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Tagalog Translator
              </h1>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(backendStatus)}
                <span className={`${backendStatus === 'online' ? 'text-green-600' : backendStatus === 'offline' ? 'text-red-600' : 'text-gray-600'}`}>
                  Backend: {getStatusText(backendStatus)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(ollamaStatus)}
                <span className={`${ollamaStatus === 'online' ? 'text-green-600' : ollamaStatus === 'offline' ? 'text-red-600' : 'text-gray-600'}`}>
                  Ollama: {getStatusText(ollamaStatus)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(whisperStatus)}
                <span className={`${whisperStatus === 'online' ? 'text-green-600' : whisperStatus === 'offline' ? 'text-red-600' : 'text-gray-600'}`}>
                  Whisper: {getStatusText(whisperStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System status warnings */}
        {(!isOnline || backendStatus === 'offline' || ollamaStatus === 'offline') && (
          <div className="mb-6">
            <div className="warning-message flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-semibold">System Status Warning</p>
                <ul className="mt-1 text-sm">
                  {!isOnline && <li>• No internet connection detected</li>}
                  {backendStatus === 'offline' && <li>• Backend server is not responding</li>}
                  {ollamaStatus === 'offline' && <li>• Ollama translation service is not available</li>}
                </ul>
                <p className="mt-2 text-sm">
                  Some features may not work properly. Please check your connection and ensure all services are running.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Translation Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Microphone and Current Translation */}
          <div className="space-y-6">
            {/* Microphone Section */}
            <div className="card text-center">
              <div className="mb-6">
                <Languages className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Voice Translation
                </h2>
                <p className="text-gray-600">
                  Click the microphone and speak in Tagalog
                </p>
              </div>

              {/* Speech Method Toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => setUseWhisper(false)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      !useWhisper 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Web Speech API
                  </button>
                  <button
                    onClick={() => setUseWhisper(true)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      useWhisper 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Faster-Whisper AI
                  </button>
                </div>
              </div>

              {/* Microphone Button */}
              <div className="mb-6">
                {useWhisper ? (
                  <WhisperMicrophoneButton
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    isSupported={whisperSupported}
                    onStart={handleStartListening}
                    onStop={handleStopListening}
                    disabled={translationLoading || backendStatus === 'offline' || whisperStatus === 'offline'}
                  />
                ) : (
                  <MicrophoneButton
                    isListening={webIsListening}
                    isSupported={speechSupported}
                    onStart={handleStartListening}
                    onStop={handleStopListening}
                    disabled={translationLoading || backendStatus === 'offline'}
                  />
                )}
              </div>

              {/* Current transcript display */}
              {(transcript || currentTranscript) && (
                <div className="mb-4">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">You said:</p>
                    <p className="text-gray-900 font-medium">
                      "{transcript || currentTranscript}"
                    </p>
                  </div>
                </div>
              )}

              {/* Current translation display */}
              {translation && (
                <div className="mb-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-blue-600">Translation:</p>
                      {confidence > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                          confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-blue-900 font-medium text-lg">
                      "{translation}"
                    </p>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {translationLoading && (
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <div className="spinner"></div>
                  <span className="text-sm">Translating...</span>
                </div>
              )}

              {/* Error messages */}
              {speechError && (
                <div className="error-message mb-4">
                  <p className="font-semibold">Speech Recognition Error:</p>
                  <p>{speechError}</p>
                </div>
              )}

              {translationError && (
                <div className="error-message mb-4">
                  <p className="font-semibold">Translation Error:</p>
                  <p>{translationError}</p>
                  <button
                    onClick={clearError}
                    className="mt-2 text-sm underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Instructions */}
              {!speechSupported && (
                <div className="warning-message">
                  <p className="font-semibold">Browser Not Supported</p>
                  <p>Please use Chrome, Safari, or Edge for voice recognition.</p>
                </div>
              )}
            </div>

            {/* Text Input for Manual Testing */}
            <TextInput
              onTranslate={translateText}
              isLoading={translationLoading}
              disabled={backendStatus === 'offline'}
            />

            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{history.length}</div>
                  <div className="text-sm text-gray-600">Translations</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {history.length > 0 ? Math.round(history.reduce((acc, item) => acc + item.confidence, 0) / history.length * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Translation History */}
          <div>
            <TranslationHistory
              history={history}
              onClearHistory={clearHistory}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App