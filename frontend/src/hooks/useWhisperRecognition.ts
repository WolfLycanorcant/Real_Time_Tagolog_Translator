import { useState, useRef, useCallback, useEffect } from 'react'

interface WhisperRecognitionError {
  message: string
  code?: string
}

interface UseWhisperRecognitionReturn {
  transcript: string
  isRecording: boolean
  isProcessing: boolean
  isSupported: boolean
  error: string | null
  confidence: number
  startRecording: () => void
  stopRecording: () => void
  resetTranscript: () => void
}

export const useWhisperRecognition = (): UseWhisperRecognitionReturn => {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [confidence, setConfidence] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // Check if MediaRecorder is supported
    setIsSupported(
      typeof navigator !== 'undefined' && 
      'mediaDevices' in navigator && 
      'getUserMedia' in navigator.mediaDevices &&
      typeof MediaRecorder !== 'undefined'
    )
  }, [])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser.')
      return
    }

    if (isRecording) {
      return
    }

    try {
      setError(null)
      setTranscript('')
      setConfidence(0)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      streamRef.current = stream
      audioChunksRef.current = []

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsProcessing(true)
        
        try {
          // Combine audio chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          
          // Send to backend for transcription
          await transcribeAudio(audioBlob)
          
        } catch (error) {
          console.error('Transcription failed:', error)
          setError(error instanceof Error ? error.message : 'Transcription failed')
        } finally {
          setIsProcessing(false)
          cleanup()
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording failed. Please try again.')
        setIsRecording(false)
        setIsProcessing(false)
        cleanup()
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      
      console.log('🎤 Recording started with Faster-Whisper')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Microphone permission denied. Please allow microphone access and try again.')
        } else if (error.name === 'NotFoundError') {
          setError('No microphone found. Please check your audio devices.')
        } else {
          setError(`Failed to start recording: ${error.message}`)
        }
      } else {
        setError('Failed to start recording. Please try again.')
      }
      
      cleanup()
    }
  }, [isSupported, isRecording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      console.log('🛑 Recording stopped, processing with Faster-Whisper...')
    }
  }, [isRecording])

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', 'tl') // Tagalog

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      setTranscript(result.text || '')
      setConfidence(result.confidence || 0)
      
      console.log('✅ Transcription completed:', result.text)
      
    } catch (error) {
      console.error('Transcription API error:', error)
      throw error
    }
  }

  const cleanup = useCallback(() => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Clear references
    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
    setConfidence(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    transcript,
    isRecording,
    isProcessing,
    isSupported,
    error,
    confidence,
    startRecording,
    stopRecording,
    resetTranscript
  }
}