# わんサポAI 🐶✨

**講義資料を学習して、かわいい犬キャラクターが音声で回答してくれる RAG チャットボット**

Next.js 16 (App Router)、Groq API、IndexedDB、Transformers.js を使用した次世代AIティーチャーアプリケーションです。

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black)
![License](https://img.shields.io/badge/license-Private-red)

---

## 📚 目次

- [特徴](#-特徴)
- [技術スタック](#-技術スタック)
- [フォルダ構成](#-フォルダ構成)
- [セットアップ](#-セットアップ)
- [使い方](#-使い方)
- [主要機能の詳細](#-主要機能の詳細)
- [開発](#-開発)
- [トラブルシューティング](#-トラブルシューティング)

---

## ✨ 特徴

### 🎭 インタラクティブなキャラクターUI
- **アニメーション犬キャラクター**: 感情豊かに反応するかわいい犬のGIFアニメーション
- **感情表現**: \`happy\`（嬉しい）、\`thinking\`（考え中）、\`neutral\`（通常）、\`surprised\`（驚き）の感情状態
- **モダンなグラスモーフィズムデザイン**: 透明感のある美しいUI/UX
- **レスポンシブ対応**: スマートフォン、タブレット、デスクトップに完全対応

### 🗣️ 音声対話システム
- **音声入力 (STT)**: Web Speech Recognition API を使用したリアルタイム音声認識
- **音声読み上げ (TTS)**: Web Speech Synthesis API を使用した日本語音声出力
- **ハンズフリー対応**: マイクボタンで簡単に音声入力を開始/停止

### 🧠 RAG (検索拡張生成) システム
- **文書アップロード**: テキスト (\`.txt\`)、Markdown (\`.md\`)、PDF (\`.pdf\`) ファイルに対応
- **PDFページ追跡**: PDFのチャンクがどのページから来たか記録・表示
- **PDFビューワー内蔵**: 参照リンクをクリックすると該当ページを直接表示
- **ベクトル埋め込み**: Transformers.js (\`Xenova/paraphrase-multilingual-MiniLM-L12-v2\`) による多言語対応の埋め込み生成
- **ブラウザ内ベクトルストア**: IndexedDB を使用したクライアントサイド完結のベクトル検索
- **コサイン類似度検索**: クエリに最も関連性の高い上位3チャンクを自動検索・抽出
- **参考資料リンク**: 回答に使用した資料のリンクをページ番号付きで表示

### 🔑 柔軟なAPIキー管理
- **サーバー側設定**: \`.env.local\` で管理者がAPIキーを設定可能
- **クライアント側設定**: ユーザーが自分のAPIキーをブラウザに保存可能
- **切り替え対応**: サーバーキーがない場合のみクライアントキーを使用

### 🚀 高速なAI応答
- **Groq API**: 超高速推論を実現
- **ストリーミング対応**: リアルタイムで回答を表示
- **子犬キャラクター設定**: 明るく元気な犬のAIアシスタントがユーザーの学習をサポート

### 🎨 プレミアムなデザイン
- **Tailwind CSS v4**: 最新のユーティリティファーストCSS
- **Framer Motion**: スムーズなアニメーション効果
- **Lucide React**: 美しいアイコンライブラリ
- **グラデーション & ブラー効果**: 視覚的に魅力的なグラスモーフィズムデザイン
- **Markdown レンダリング**: \`react-markdown\` および \`remark-gfm\` によるリッチなテキスト表示

---

## 📋 資料アップロードの仕様

| 項目 | 内容 |
|------|------|
| **📁 対応形式** | PDF, TXT, MD |
| **📏 サイズ上限** | 1ファイルあたり10MBまで |
| **💾 保存先** | ブラウザのローカルストレージ (IndexedDB) |
| **⚠️ 注意** | ブラウザのデータを消去すると資料も削除されます |

---

## 🛠️ 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Next.js** | 16.1.4 | React フレームワーク (App Router) |
| **React** | 19.2.3 | UI ライブラリ |
| **TypeScript** | ^5 | 型安全な開発 |
| **Tailwind CSS** | ^4 | スタイリング |
| **Framer Motion** | 12.29.0 | アニメーション |
| **Lucide React** | 0.563.0 | アイコン |
| **React Markdown** | 10.1.0 | Markdown レンダリング |

### AI & RAG
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Groq SDK** | 0.37.0 | Groq API クライアント (LLM) |
| **@xenova/transformers** | 2.17.2 | ブラウザ内機械学習 (埋め込み生成) |
| **pdfjs-dist** | 5.4.530 | PDF テキスト抽出・表示 |

### データベース & ストレージ
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **idb** | 8.0.3 | IndexedDB ラッパー (ベクトルストア) |

### 音声処理
| 技術 | 用途 |
|------|------|
| **Web Speech API** | 音声認識 (STT) & 音声合成 (TTS) |

---

## 📂 フォルダ構成

\`\`\`
ai-chatbot-sample/
├── public/                      # 静的ファイル
│   └── dog_3d.gif              # 犬キャラクターアニメーション
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # メインページ (チャットUI)
│   │   ├── actions.ts          # Server Actions (Groq API呼び出し)
│   │   ├── globals.css         # グローバルスタイル
│   │   ├── layout.tsx          # ルートレイアウト
│   │   └── api/
│   │       ├── chat/route.ts   # チャットAPI (ストリーミング対応)
│   │       └── config/route.ts # 設定API (サーバーキー確認)
│   │
│   ├── components/             # Reactコンポーネント
│   │   ├── Character.tsx       # キャラクターコンポーネント
│   │   ├── ApiKeySettings.tsx  # APIキー設定モーダル
│   │   ├── DocumentViewer.tsx  # ドキュメント閲覧モーダル
│   │   └── PdfViewer.tsx       # PDFビューワー (ページ指定対応)
│   │
│   ├── hooks/                  # カスタムフック
│   │   └── use-speech.ts       # 音声認識・音声合成フック (STT/TTS)
│   │
│   ├── lib/                    # ユーティリティライブラリ
│   │   ├── db.ts               # IndexedDB操作 (ドキュメント・チャンク・PDF保存)
│   │   ├── embeddings.ts       # Transformers.js による埋め込み生成
│   │   ├── llm.ts              # Groq API クライアント設定
│   │   ├── pdf.ts              # PDF テキスト抽出 (ページ情報付き)
│   │   ├── rag.ts              # RAGロジック (チャンク分割、検索、PDF対応)
│   │   ├── rag-actions.ts      # Server Actions (埋め込み生成)
│   │   └── utils.ts            # ユーティリティ関数
│   │
│   └── types/                  # 型定義
│       └── speech.d.ts         # Web Speech API 型定義
│
├── docs/                       # ドキュメント
│   ├── task.md                 # タスク一覧
│   ├── implementation_plan.md  # 実装計画
│   └── walkthrough.md          # 検証手順
│
├── .env.local                  # 環境変数 (GROQ_API_KEY) - オプション
├── package.json                # 依存関係
├── tsconfig.json               # TypeScript設定
├── next.config.ts              # Next.js設定
├── Dockerfile                  # Dockerイメージ定義
├── docker-compose.yml          # Docker Compose設定
└── README.md                   # このファイル
\`\`\`

---

## 🚀 セットアップ

### 前提条件

- **Node.js**: v18 以上
- **npm**: v9 以上
- **Groq API Key**: [Groq Console](https://console.groq.com/) で取得

### 1. リポジトリのクローン

\`\`\`bash
git clone <repository-url>
cd ai-chatbot-sample
\`\`\`

### 2. 依存関係のインストール

\`\`\`bash
npm install
\`\`\`

### 3. 環境変数の設定（オプション）

サーバー側でAPIキーを管理する場合は、プロジェクトルートに \`.env.local\` ファイルを作成してください。

\`\`\`bash
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

> **注意**: 環境変数を設定しない場合、ユーザーが自分のAPIキーをブラウザで設定できます。

### 4. 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

ブラウザで **http://localhost:3000** を開いてください。

---

## 🐳 Docker での起動

### 環境変数の設定（オプション）

\`\`\`bash
export GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

### Docker Compose で起動

\`\`\`bash
docker-compose up --build
\`\`\`

ブラウザで **http://localhost:3000** を開いてください。

---

## 📖 使い方

### 1. APIキーの設定

**サーバーキーがない場合:**
1. 右上の **🔑 鍵アイコン** をクリック
2. Groq API Key を入力
3. **保存** ボタンをクリック

### 2. 基本的なチャット

1. テキスト入力フィールドに質問を入力
2. **送信ボタン** (紙飛行機アイコン) をクリック
3. 犬のキャラクターが回答を表示

### 3. 音声入力

1. **マイクボタン** (マイクアイコン) をクリック
2. 話しかける (ブラウザが音声認識を開始)
3. もう一度 **マイクボタン** をクリックして停止
4. 認識されたテキストが自動的に入力フィールドに挿入される
5. **送信ボタン** で送信

### 4. 資料のアップロード (RAG)

1. **クリップボタン** (📎アイコン) をクリック
2. \`.txt\`, \`.md\`, または \`.pdf\` ファイルを選択
3. アップロード中のステータスが表示される
4. アップロードが完了すると「資料を覚えたよ！」とアラート表示
5. 質問すると、アップロードした資料を基に回答

### 5. 参考資料の確認

- AIの回答の下に **📖 参考資料** セクションが表示される
- 各資料のリンクにはページ番号が表示される (例: \`p.3-4\`)
- リンクをクリックすると:
  - **PDF**: PDFビューワーが開き、該当ページを表示
  - **テキスト**: ドキュメントビューワーで該当箇所をハイライト表示

### 6. 資料の管理

- **ドキュメント数バッジ**: ヘッダー右上の **📚 資料管理** をクリックすると資料一覧パネルが開く
- **資料情報**: 対応形式、サイズ上限、保存先の説明を表示
- **個別削除**: 各資料の右側に表示されるゴミ箱アイコンで削除
- **一括削除**: ヘッダー右上のゴミ箱ボタンで全資料を削除

### 7. 音声読み上げ

- AIの回答メッセージにマウスをホバーすると、**スピーカーアイコン** が表示される
- クリックすると、その回答を音声で読み上げる

---

## 🔍 主要機能の詳細

### RAG (検索拡張生成) の仕組み

1. **ドキュメント保存**:
   - アップロードされたファイルを IndexedDB の \`documents\` ストアに保存
   - PDFの場合は元ファイル (Blob) も保存
   - 各ドキュメントに一意のIDとタイトルを付与

2. **チャンク分割**:
   - ドキュメントを500文字単位でチャンクに分割
   - PDFの場合、各チャンクにページ番号情報を付与
   - 各チャンクを \`chunks\` ストアに保存

3. **埋め込み生成**:
   - Server Actions (\`rag-actions.ts\`) を経由して Transformers.js を実行
   - モデル: \`Xenova/paraphrase-multilingual-MiniLM-L12-v2\` (多言語対応)
   - 各チャンクのベクトル埋め込みを生成し、IndexedDB に保存

4. **検索**:
   - ユーザーの質問を同じモデルでベクトル埋め込みに変換
   - 全チャンクとのコサイン類似度を計算
   - 類似度上位3チャンクを抽出

5. **LLM への入力**:
   - 抽出したチャンクを参考資料としてシステムプロンプトに追加
   - Groq API に送信（ストリーミング）
   - AIが資料を基に回答を生成
   - 参照した資料のリンクを回答と共に表示

### PDFビューワー機能

- **pdfjs-dist** を使用したブラウザ内PDF表示
- ページナビゲーション（前/次ページ、ページジャンプ）
- ズーム機能（拡大/縮小、25%刻み、50%〜300%）
- 参照リンクから該当ページに直接ジャンプ
- テキスト表示モードへの切り替え

### AI キャラクター設定

システムプロンプトで以下の性格が設定されています:

- **性格**: 明るく元気いっぱいで、いつも前向き
- **言葉遣い**: 語尾に「〜ワン！」「〜だワン」を使う
- **絵文字**: 🐶, 🎾, ✨, 💕, 🦴 など多用
- **表現**: 「わんわん！」と吠えたり、「くんくん」と匂いを嗅ぐような表現
- **役割**: 講義資料を基に質問に答える学習サポートAI

---

## 👨‍💻 開発

### ビルド

\`\`\`bash
npm run build
\`\`\`

### プロダクション起動

\`\`\`bash
npm run start
\`\`\`

### Lint チェック

\`\`\`bash
npm run lint
\`\`\`

---

## 🐛 トラブルシューティング

### 1. APIキーエラー

**症状**: "APIキーが設定されていないワン！🔑" と表示される

**解決策**:
- 右上の🔑アイコンからAPIキーを設定
- または \`.env.local\` に \`GROQ_API_KEY\` を設定してサーバーを再起動

### 2. PDF アップロードエラー

**症状**: "PDFの読み込みに失敗しちゃった...😭" と表示される

**解決策**:
- 別のPDFファイルを試す
- ファイルサイズが10MB以下か確認

### 3. PDFビューワーが表示されない

**症状**: 参照リンクをクリックしてもPDFが表示されない

**原因**: 古い形式でアップロードされた資料にはPDF本体が保存されていない

**解決策**:
- 資料を削除して再度アップロード

### 4. 音声認識が動かない

**症状**: マイクボタンを押しても反応しない

**解決策**:
- Chrome または Edge ブラウザを使用
- ブラウザの設定でマイク権限を許可
- HTTPS環境で実行 (localhost は HTTP でも可)

### 5. 埋め込み生成が遅い

**症状**: "埋め込みを生成中..." で長時間待たされる

**原因**: 初回実行時にモデル (約120MB) をダウンロード

**解決策**:
- 初回は1-2分程度待つ
- 2回目以降はブラウザキャッシュが使われるため高速化

### 6. Docker で起動しない

**解決策**:
\`\`\`bash
export GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
docker-compose up --build
\`\`\`

---

## 📚 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Groq API Documentation](https://console.groq.com/docs)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

## 📄 ライセンス

Private

---

**わんわん！🐶 ボクと一緒に楽しく勉強するワン！**
