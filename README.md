# Local AI ChatBot

A fully local, privacy-focused conversational AI system powered by TinyLlama-1.1B open-source model. No external API calls or internet connection required, ideal for privacy-sensitive applications.

---

## Tech Stack
- **Backend**: FastAPI (Python)
- **AI Model**: TinyLlama-1.1B-Chat-v1.0
- **Frontend**: HTML5/CSS3/JavaScript
- **Quantization**: bitsandbytes (4-bit)
- **Context Management**: Custom dialogue tracking

---

## Core Features

### Localized AI Engine
+ **Fully offline operation**: All processing happens on-device
+ **Lightweight model**: 1.1B parameter model optimized for consumer hardware
+ **4-bit quantization**: Runs on GPUs with as little as 4GB VRAM

### Intelligent Conversation Control
+ **Response length tuning**: 50-300 token range adjustment
+ **Creativity control**: 0.1-1.0 temperature slider
+ **Context management**: Maintains last 10 dialogue turns

### User Experience
+ **Typing indicators**: Real-time AI response animation
+ **Conversation history**: Automatic session recording
+ **Visual parameter controls**: Intuitive slider interfaces

### Technical Integration
+ **RESTful API**: Standardized endpoints for integration
+ **Cross-platform**: Web frontend works on any modern browser
+ **CORS ready**: Pre-configured for development testing

---

## Key Advantages

### Performance Optimizations
+ **Auto-device detection**: Smart CPU/GPU switching
+ **Memory management**: Strict context window control
+ **Quantization**: Supports 4-bit/8-bit precision modes

### Developer Features
+ **Health monitoring**: `/health` endpoint for system checks
+ **Detailed logging**: Full request and model load tracking
+ **Error handling**: Standardized error responses

### Privacy & Security
+ **On-device processing**: No data leaves local machine
+ **Session isolation**: Separate history per conversation ID
+ **Automatic cleanup**: Sensitive data wiped post-session

---

## Use Cases
+ **Privacy-first chat applications**
+ **Local knowledge Q&A systems**
+ **Developer AI testing platform**
+ **Educational NLP learning tool**

---

## Quick Start
```bash
# Install dependencies
pip install fastapi uvicorn transformers torch accelerate bitsandbytes

# Launch backend
python ai_api_server.py

# Open interface (in browser)
open index.html

---

## Preview
<img src="Preview/Preview1" width="300"/>
<img src="Preview/Preview2" width="300"/>
