#!/usr/bin/env python3
"""
Faster-Whisper Speech Recognition Service
Provides real-time speech-to-text API for Tagalog Translator
"""

import os
import tempfile
import logging
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("ERROR: faster-whisper not installed. Run: pip install faster-whisper")
    exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Faster-Whisper Speech Recognition Service",
    description="Real-time speech-to-text API for Tagalog Translator",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global whisper model instance
whisper_model: Optional[WhisperModel] = None

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    confidence: float
    duration: float
    segments: list

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_size: str
    device: str

def initialize_whisper_model():
    """Initialize the Faster-Whisper model"""
    global whisper_model
    
    try:
        # Use small model for faster processing, medium/large for better accuracy
        model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
        device = os.getenv("WHISPER_DEVICE", "cpu")  # or "cuda" for GPU
        
        logger.info(f"Loading Whisper model: {model_size} on {device}")
        
        whisper_model = WhisperModel(
            model_size, 
            device=device,
            compute_type="float16" if device == "cuda" else "int8"
        )
        
        logger.info("✅ Whisper model loaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to load Whisper model: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    logger.info("🚀 Starting Faster-Whisper Service...")
    
    if not initialize_whisper_model():
        logger.error("Failed to initialize Whisper model")
        # Don't exit, allow health check to show the error
    
    logger.info("✅ Faster-Whisper Service ready")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    global whisper_model
    
    model_loaded = whisper_model is not None
    model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    
    return HealthResponse(
        status="healthy" if model_loaded else "unhealthy",
        model_loaded=model_loaded,
        model_size=model_size,
        device=device
    )

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: str = "tl"  # Default to Tagalog
):
    """
    Transcribe audio file to text
    
    Args:
        audio_file: Audio file (WAV, MP3, M4A, etc.)
        language: Language code (tl for Tagalog, en for English)
    
    Returns:
        TranscriptionResponse with text and metadata
    """
    global whisper_model
    
    if whisper_model is None:
        raise HTTPException(
            status_code=503, 
            detail="Whisper model not loaded. Check service health."
        )
    
    if not audio_file.content_type.startswith('audio/'):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {audio_file.content_type}. Expected audio file."
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing audio file: {audio_file.filename} ({len(content)} bytes)")
        
        # Transcribe with Faster-Whisper
        segments, info = whisper_model.transcribe(
            temp_file_path,
            language=language if language != "auto" else None,
            beam_size=5,
            best_of=5,
            temperature=0.0,
            condition_on_previous_text=False,
            vad_filter=True,  # Voice Activity Detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Process segments
        transcript_segments = []
        full_text = ""
        total_duration = 0
        
        for segment in segments:
            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": getattr(segment, 'avg_logprob', 0.0)
            }
            transcript_segments.append(segment_data)
            full_text += segment.text.strip() + " "
            total_duration = max(total_duration, segment.end)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Calculate average confidence
        avg_confidence = sum(s.get('confidence', 0) for s in transcript_segments) / len(transcript_segments) if transcript_segments else 0
        
        # Convert log probability to confidence score (0-1)
        confidence_score = max(0.0, min(1.0, (avg_confidence + 5) / 5))  # Normalize from [-5,0] to [0,1]
        
        result = TranscriptionResponse(
            text=full_text.strip(),
            language=info.language,
            confidence=confidence_score,
            duration=total_duration,
            segments=transcript_segments
        )
        
        logger.info(f"✅ Transcription completed: '{result.text[:50]}...' (confidence: {confidence_score:.2f})")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/transcribe-realtime")
async def transcribe_realtime(
    audio_chunk: UploadFile = File(...),
    language: str = "tl"
):
    """
    Real-time transcription for streaming audio chunks
    Optimized for low latency
    """
    global whisper_model
    
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper model not loaded")
    
    try:
        # Save chunk temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_chunk.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Quick transcription with minimal processing
        segments, info = whisper_model.transcribe(
            temp_file_path,
            language=language if language != "auto" else None,
            beam_size=1,  # Faster but less accurate
            best_of=1,
            temperature=0.0,
            vad_filter=False  # Skip VAD for speed
        )
        
        # Get first segment text
        text = ""
        confidence = 0.0
        
        for segment in segments:
            text += segment.text.strip() + " "
            confidence = getattr(segment, 'avg_logprob', 0.0)
            break  # Only process first segment for speed
        
        # Clean up
        os.unlink(temp_file_path)
        
        return {
            "text": text.strip(),
            "language": info.language,
            "confidence": max(0.0, min(1.0, (confidence + 5) / 5)),
            "is_final": True
        }
        
    except Exception as e:
        logger.error(f"Real-time transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_available_models():
    """List available Whisper models"""
    models = [
        {"name": "tiny", "size": "39 MB", "speed": "~32x", "accuracy": "Low"},
        {"name": "base", "size": "74 MB", "speed": "~16x", "accuracy": "Medium"},
        {"name": "small", "size": "244 MB", "speed": "~6x", "accuracy": "Good"},
        {"name": "medium", "size": "769 MB", "speed": "~2x", "accuracy": "Better"},
        {"name": "large-v2", "size": "1550 MB", "speed": "~1x", "accuracy": "Best"},
        {"name": "large-v3", "size": "1550 MB", "speed": "~1x", "accuracy": "Best"}
    ]
    
    current_model = os.getenv("WHISPER_MODEL_SIZE", "small")
    
    return {
        "available_models": models,
        "current_model": current_model,
        "device": os.getenv("WHISPER_DEVICE", "cpu")
    }

if __name__ == "__main__":
    # Configuration
    host = os.getenv("WHISPER_HOST", "0.0.0.0")
    port = int(os.getenv("WHISPER_PORT", "8000"))
    
    logger.info(f"🎤 Starting Faster-Whisper Service on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Set to True for development
        log_level="info"
    )
