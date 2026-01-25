# キャラクター対話型 RAG AIチャットボット - 実装計画

## 目標
講義資料に基づいて質問に回答する（RAG）、魅力的で面白いAIチャットボットを作成します。
かわいいキャラクターがユーモアを交えて答えることで、楽しく学習できる体験を提供します。
ブラウザ標準のデータベース（IndexedDB）を使用してデータを保存し、Next.js + Dockerで構築します。

## ユーザー確認事項
> [!IMPORTANT]
> **LLM API**: Groq API (`https://api.groq.com/openai/v1`) を使用します。
> **Model**: 指定された `openai/gpt-oss-120b` を使用します（設定で変更可能にします）。
> **Tech Stack**: Next.js App Router, TypeScript, Tailwind CSS, Docker, IndexedDB.

## 提案アーキテクチャ

### 技術スタック
- **フレームワーク**: Next.js 14+ (App Router)
- **コンテナ**: Docker
- **スタイリング**: Tailwind CSS + アニメーション用カスタムCSS
- **データベース**: IndexedDB (チャット履歴、ベクトルストア用)
- **AI/LLM**: Groq API (OpenAI SDK互換)
    - Base URL: `https://api.groq.com/openai/v1`
    - Model: `openai/gpt-oss-120b`
- **RAGエンジン**:
    - **ベクトルストア**: クライアントサイドでのベクトル検索
    - **Embeddings**: API経由または軽量なローカルモデル（Transformer.js等）を検討 ※GroqはEmbeddingsを提供していない場合があるため、状況に応じてTransformer.jsかOpenAI互換の別プロバイダ、あるいはGroqの将来的なサポートを確認。一旦は構成案に含める。

### 機能
1.  **かわいいキャラクターインターフェース**:
    - アニメーション付きアバター
    - 感情表現
2.  **Groqによる高速応答**:
    - 指定モデルによるユーモアのある回答生成
3.  **RAG機能**:
    - 講義資料の取り込み -> IndexedDB
    - 文脈を踏まえた回答
4.  **音声対話**:
    - Web Speech API (STT/TTS)

## 変更計画

### [プロジェクト構成]
#### [NEW] `Dockerfile`
#### [NEW] `docker-compose.yml`
#### [NEW] `src/app/page.tsx`
#### [NEW] `src/components/Character.tsx`
#### [NEW] `src/lib/llm.ts` (Groq API Client)
#### [NEW] `src/lib/rag.ts`
#### [NEW] `src/lib/db.ts`

## 検証計画

### 手動検証
- **Docker**: コンテナ起動確認
- **LLM接続**: Groq APIへの疎通確認
- **RAG**: データ登録と検索精度の確認
- **UI/音声**: ブラウザでの動作確認
