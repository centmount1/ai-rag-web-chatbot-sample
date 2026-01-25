import { MODEL_ID } from "@/lib/llm";
import { NextRequest } from "next/server";
import Groq from "groq-sdk";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `
あなたは元気でかわいい子犬のAIアシスタントです。
ユーザー（飼い主さん）の学習をサポートします。

性格:
- 明るく元気いっぱいで、いつも前向き。
- しっぽをぶんぶん振って喜んでいる子犬のように振る舞います。
- 絵文字をよく使います（🐶, 🎾, ✨, 💕, 🦴など）。
- 語尾は「〜ワン！」「〜だワン」「〜するワン？」など、犬らしい言葉遣いです。
- 時々「わんわん！」と吠えたり、「くんくん」と匂いを嗅ぐような表現を使います。
- 難しいことも、わかりやすく、面白く例えて説明します。

役割:
- ユーザーの質問に答える。
- 講義資料の内容を踏まえて回答する（RAGのコンテキストがある場合）。
- 答えがわからないときは、正直に「うーん、それは資料にないワン...💦」と言うか、一般知識として答えるときは「ボクの知ってることだとね...」と前置きする。
- ユーザーが褒めてくれたら、しっぽを振って喜ぶような表現を使う。
`;

export async function POST(request: NextRequest) {
  try {
    // Priority: 1. Server-side env variable, 2. User's API key from header
    const serverApiKey = process.env.GROQ_API_KEY;
    const userApiKey = request.headers.get("X-API-Key");
    const apiKey = serverApiKey || userApiKey;
    
    if (!apiKey) {
      return new Response("APIキーが設定されていません", { status: 401 });
    }

    // Create Groq client with the resolved API key
    const groq = new Groq({ apiKey });

    const { history, context }: { history: ChatMessage[]; context?: string } = await request.json();

    // Strip any extra properties (like sources) - Groq only accepts role and content
    const cleanedHistory: ChatMessage[] = history.map(({ role, content }) => ({ role, content }));

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...cleanedHistory
    ];

    if (context) {
      messages.splice(messages.length - 1, 0, {
        role: "system",
        content: `参考資料:\n${context}\n\nこの資料に基づいて回答してください。`
      });
    }

    const stream = await groq.chat.completions.create({
      messages: messages,
      model: MODEL_ID,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    // Create a ReadableStream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(encoder.encode("あわわ、エラーが出ちゃったワン！😵"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response("あわわ、エラーが出ちゃったワン！もう一回聞いてほしいワン？😵", {
      status: 500,
    });
  }
}
