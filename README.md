# Tagalog-to-English Voice Translator

A full-stack real-time voice translation application using local Ollama with sailor2:8b model.

## Prerequisites

1. **Node.js 18+** installed
2. **Ollama** installed and running
3. **sailor2:8b model** downloaded in Ollama

### Ollama Setup

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Download the sailor2:8b model
ollama pull sailor2:8b

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

## Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:3001`
- Frontend server on `http://localhost:5173`

## Project Structure

```
tagalog-translator/
├── frontend/          # React frontend
├── backend/           # Node.js/Express backend
├── docs/              # Documentation
└── package.json       # Root package.json
```

## Development Workflow

1. **Error Handling Framework** (MUST BE COMPLETED FIRST)
2. **Backend API Development**
3. **Frontend Components**
4. **Integration Testing**
5. **Tunnel Compatibility Testing**

## Tunnel Access

The application is configured to work through tunnels (ngrok, Cloudflare, etc.) with comprehensive CORS support.

## Documentation

- [Design Document](docs/design-document.md)
- [Development Roadmap](docs/development-roadmap.md)
- [Tunnel Exception Guidance](docs/tunnel_exception_guidance.md)