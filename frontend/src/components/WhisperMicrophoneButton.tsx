import React from 'react'
import { Mic, MicOff, Square, Loader2 } from 'lucide-react'

interface WhisperMicrophoneButtonProps {
  isRecording: boolean
  isProcessing: boolean
  isSupported: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export const WhisperMicrophoneButton: React.FC<WhisperMicrophoneButtonProps> = ({
  isRecording,
  isProcessing,
  isSupported,
  onStart,
  onStop,
  disabled = false
}) => {
  const handleClick = () => {
    if (isRecording) {
      onStop()
    } else if (!isProcessing) {
      onStart()
    }
  }

  const getButtonState = () => {
    if (isProcessing) return 'processing'
    if (isRecording) return 'recording'
    return 'idle'
  }

  const getButtonStyles = () => {
    const state = getButtonState()
    const baseStyles = "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50"
    
    if (disabled || !isSupported) {
      return `${baseStyles} bg-gray-300 cursor-not-allowed opacity-50`
    }
    
    switch (state) {
      case 'recording':
        return `${baseStyles} bg-red-500 hover:bg-red-600 focus:ring-red-300 shadow-lg`
      case 'processing':
        return `${baseStyles} bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300 shadow-md cursor-wait`
      default:
        return `${baseStyles} bg-blue-500 hover:bg-blue-600 focus:ring-blue-300 shadow-md`
    }
  }

  const getButtonIcon = () => {
    const state = getButtonState()
    const iconClass = "w-8 h-8 text-white"
    
    switch (state) {
      case 'recording':
        return <Square className={iconClass} />
      case 'processing':
        return <Loader2 className={`${iconClass} animate-spin`} />
      default:
        return <Mic className={iconClass} />
    }
  }

  const getStatusText = () => {
    if (!isSupported) return 'Not supported'
    if (disabled) return 'Disabled'
    
    const state = getButtonState()
    switch (state) {
      case 'recording':
        return 'Recording...'
      case 'processing':
        return 'Processing...'
      default:
        return 'Click to record'
    }
  }

  const getSubText = () => {
    if (!isSupported) return 'Browser not supported'
    if (disabled) return 'Service unavailable'
    
    const state = getButtonState()
    switch (state) {
      case 'recording':
        return 'Speak in Tagalog'
      case 'processing':
        return 'Transcribing with AI...'
      default:
        return 'Powered by Faster-Whisper'
    }
  }

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <button
            disabled
            className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center cursor-not-allowed"
          >
            <MicOff className="w-8 h-8 text-gray-500" />
          </button>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-red-600">Browser Not Supported</p>
          <p className="text-xs text-red-500 mt-1 max-w-xs">
            Audio recording is not supported in this browser. Please use Chrome, Safari, or Edge.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Pulse ring animation when recording */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse-ring"></div>
        )}
        
        {/* Processing ring animation */}
        {isProcessing && (
          <div className="absolute inset-0 rounded-full bg-yellow-400 animate-pulse"></div>
        )}
        
        {/* Main microphone button */}
        <button
          onClick={handleClick}
          disabled={disabled || !isSupported}
          className={getButtonStyles()}
          aria-label={getStatusText()}
        >
          {getButtonIcon()}
        </button>
      </div>
      
      {/* Status text */}
      <div className="mt-4 text-center">
        <p className={`text-sm font-medium ${
          isRecording ? 'text-red-600' : 
          isProcessing ? 'text-yellow-600' : 
          'text-gray-600'
        }`}>
          {getStatusText()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {getSubText()}
        </p>
      </div>
      
      {/* Progress indicator for processing */}
      {isProcessing && (
        <div className="mt-2 w-32 bg-gray-200 rounded-full h-1">
          <div className="bg-yellow-500 h-1 rounded-full animate-pulse w-full"></div>
        </div>
      )}
    </div>
  )
}