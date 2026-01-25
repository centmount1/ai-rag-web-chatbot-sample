import Groq from "groq-sdk";

// Model ID constant - safe to export at module level
export const MODEL_ID = "openai/gpt-oss-120b";

// Factory function to create Groq client with optional API key
// This avoids instantiation at module load time, allowing builds without env vars
export function createGroqClient(apiKey?: string): Groq {
  const resolvedKey = apiKey || process.env.GROQ_API_KEY;
  if (!resolvedKey) {
    throw new Error("APIキーが設定されていません");
  }
  return new Groq({ apiKey: resolvedKey });
}

// Lazy-loaded singleton for server-side usage (when env var is available)
let _groq: Groq | null = null;
export function getGroqClient(): Groq {
  if (!_groq) {
    _groq = createGroqClient();
  }
  return _groq;
}
