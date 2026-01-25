# RAG AI Chatbot Verification Walkthrough

## Overview
We have successfully implemented the RAG AI Chatbot using Next.js, Groq API, and IndexedDB.

## Features Implemented
- **Cute Character UI**: A friendly avatar that reacts to status (Happy, Thinking).
- **Voice Interaction**: Speech-to-Text (STT) and Text-to-Speech (TTS) using Web Speech API.
- **RAG Functionality**:
    - **Data Ingestion**: Upload `.txt` or `.md` files via the paperclip icon.
    - **Storage**: IndexedDB stores documents locally.
    - **Retrieval**: Keyword-based retrieval injects context into the LLM prompt.
- **LLM Integration**: Uses Groq API (`openai/gpt-oss-120b`).

## How to Verify

### 1. Setup Environment Variables
Ensure you have your `GROQ_API_KEY` ready. You can set it in a `.env.local` file or pass it to Docker.

### 2. Start the App

#### Option A: Run Locally (npm)
```bash
echo "GROQ_API_KEY=your_key_here" > .env.local
npm run dev
```

#### Option B: Run with Docker
```bash
export GROQ_API_KEY=your_key_here
docker-compose up --build
```

### 3. Verify Features
1. **Access**: Go to `http://localhost:3000`.
2. **Chat**: Type a message. The character should respond.
3. **Voice**: Click the mic icon. Speak to the character.
4. **RAG**: Upload a text file (paperclip icon). Ask a question about it.

## Code Structure
- `src/app/page.tsx`: Main UI logic.
- `src/app/actions.ts`: Server-side LLM call.
- `src/lib/rag.ts` & `src/lib/db.ts`: Client-side RAG engine.
