import React from 'react'
import { Mic, MicOff, Square } from 'lucide-react'

interface MicrophoneButtonProps {
  isListening: boolean
  isSupported: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  isListening,
  isSupported,
  onStart,
  onStop,
  disabled = false
}) => {
  const handleClick = () => {
    if (isListening) {
      onStop()
    } else {
      onStart()
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
        <p className="mt-4 text-sm text-red-600 text-center max-w-xs">
          Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Pulse ring animation when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse-ring"></div>
        )}
        
        {/* Main microphone button */}
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`
            relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 shadow-lg' 
              : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300 shadow-md'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''}
          `}
        >
          {isListening ? (
            <Square className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>
      
      {/* Status text */}
      <div className="mt-4 text-center">
        <p className={`text-sm font-medium ${isListening ? 'text-red-600' : 'text-gray-600'}`}>
          {isListening ? 'Listening...' : 'Click to speak'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {isListening ? 'Speak in Tagalog' : 'Press and speak in Tagalog'}
        </p>
      </div>
    </div>
  )
}