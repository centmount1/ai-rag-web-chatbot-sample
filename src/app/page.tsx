"use client";

import { useState, useRef, useEffect } from "react";
import { Character } from "@/components/Character";
import { ApiKeySettings, getStoredApiKey } from "@/components/ApiKeySettings";
import { DocumentViewer } from "@/components/DocumentViewer";
import PdfViewer from "@/components/PdfViewer";
import { cn } from "@/lib/utils";
import { Mic, Send, Paperclip, Trash2, Volume2, FileText, X, Sparkles, Key, BookOpen } from "lucide-react";
import { ChatMessage } from "./actions";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/use-speech";
import { saveDocument, getAllDocuments, clearDocuments } from "@/lib/db";
import { retrieveContext, processAndSaveDocument, processAndSavePDF, SourceCitation, getDocumentContent } from "@/lib/rag";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Extended message type with sources
interface MessageWithSources extends ChatMessage {
  sources?: SourceCitation[];
}

// PDF viewer state
interface PdfViewerState {
  pdfBlob: Blob;
  title: string;
  initialPage: number;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MessageWithSources[]>([
    { role: 'assistant', content: 'わんわん！🐶 ボクと一緒に楽しく勉強するワン！' }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<"searching" | "thinking" | null>(null);
  const [documents, setDocuments] = useState<{id: string, title: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [showDocs, setShowDocs] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ docId: string; highlight?: string; pageNumber?: number } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice hooks
  const { isRecording, transcript, startRecording, stopRecording } = useSpeechRecognition();
  const { speak } = useSpeechSynthesis();

  // Check for API key on load (both server and client)
  useEffect(() => {
    // Check server-side key
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setHasServerKey(data.hasServerKey);
        if (data.hasServerKey) {
          setHasApiKey(true);
        } else {
          // Only check client key if no server key
          const clientKey = getStoredApiKey();
          setHasApiKey(!!clientKey);
        }
      })
      .catch(() => {
        // Fallback to client key check
        const clientKey = getStoredApiKey();
        setHasApiKey(!!clientKey);
      });
  }, []);

  // Update input with voice transcript
  useEffect(() => {
    if (transcript) {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  // Check for docs on load
  const loadDocuments = async () => {
    const docs = await getAllDocuments();
    setDocuments(docs.map(d => ({ id: d.id, title: d.title })));
  };

  useEffect(() => {
      loadDocuments();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Optimistic update - add user message
    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setLoading(true);

    // Store sources for this response
    let responseSources: SourceCitation[] = [];

    try {
        // Check API key first (fast check)
        const clientApiKey = getStoredApiKey();
        if (!hasServerKey && !clientApiKey) {
          setMessages(prev => [...prev, { role: 'assistant', content: "APIキーが設定されていないワン！🔑\n\n右上の鍵アイコンからGroq APIキーを設定してね！" }]);
          setLoading(false);
          return;
        }

        // Stage 1: RAG Retrieval
        setLoadingStatus("searching");
        const { context, sources } = await retrieveContext(userMsg);
        responseSources = sources;
        
        // Stage 2: LLM thinking
        setLoadingStatus("thinking");
        
        // Add empty assistant message for streaming (with sources)
        setMessages(prev => [...prev, { role: 'assistant', content: '', sources: responseSources }]);

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (clientApiKey) {
          headers['X-API-Key'] = clientApiKey;
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ history: newHistory, context }),
        });

        if (!response.ok) {
          throw new Error('API error');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let accumulatedContent = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;
            
            // Update the last message with accumulated content (preserve sources)
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: accumulatedContent, sources: responseSources };
              return updated;
            });
          }
        }

    } catch (error) {
        console.error(error);
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === 'assistant' && updated[updated.length - 1]?.content === '') {
            updated[updated.length - 1] = { role: 'assistant', content: "ごめんね、ちょっと調子が悪いみたい...😢" };
          } else {
            updated.push({ role: 'assistant', content: "ごめんね、ちょっと調子が悪いみたい...😢" });
          }
          return updated;
        });
    } finally {
        setLoading(false);
        setLoadingStatus(null);
    }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setUploadProgress("読み込み中...");

      try {
        if (file.type === "application/pdf") {
            // Use specialized PDF processing that preserves page info
            try {
                await processAndSavePDF(file, (status) => {
                    setUploadProgress(status);
                });
            } catch (error) {
                console.error(error);
                alert("PDFの読み込みに失敗しちゃった...😭");
                setUploadProgress("");
                return;
            }
        } else {
            // Regular text/markdown file
            const text = await file.text();
            await processAndSaveDocument(file.name, text, (status) => {
                setUploadProgress(status);
            });
        }

        await loadDocuments();
        alert("資料を覚えたよ！");
      } catch (error) {
          console.error(error);
          alert("エラーが発生しました: " + error);
      } finally {
          setUploadProgress("");
      }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent bubbling if needed
      if (!confirm("本当にこの資料を忘れちゃっていいの？")) return;
      
      const { deleteDocument } = await import("@/lib/db");
      await deleteDocument(id);
      await loadDocuments();
  };

  const handleClearDocs = async () => {
      if (!confirm("全部忘れちゃっていいの？")) return;
      await clearDocuments();
      setDocuments([]);
      alert("資料を忘れたよ！");
  };

  return (
    <main className="min-h-screen flex flex-col bg-linear-to-br from-orange-50 via-pink-50 to-purple-50 font-sans">
      
      {/* API Key Settings Modal */}
      <ApiKeySettings
        isOpen={showApiKeySettings}
        onClose={() => setShowApiKeySettings(false)}
        onSave={(key) => setHasApiKey(!!key)}
      />

      {/* Document Viewer Modal */}
      <DocumentViewer
        docId={viewingDoc?.docId || null}
        highlightText={viewingDoc?.highlight}
        pageNumber={viewingDoc?.pageNumber}
        onClose={() => setViewingDoc(null)}
      />

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <PdfViewer
          pdfBlob={pdfViewer.pdfBlob}
          title={pdfViewer.title}
          initialPage={pdfViewer.initialPage}
          onClose={() => setPdfViewer(null)}
        />
      )}

      {/* Glass Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-linear-to-r from-pink-400 to-purple-400 rounded-full blur opacity-30 animate-pulse"></div>
                <div className="relative bg-linear-to-r from-pink-500 to-purple-500 p-2 sm:p-2.5 rounded-full">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                わんサポAI
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* API Key Settings - hide if server has key */}
              {!hasServerKey && (
                <button
                  onClick={() => setShowApiKeySettings(true)}
                  className={cn(
                    "group p-2 sm:p-2.5 rounded-full shadow-sm hover:shadow-md transition-all duration-300 border hover:scale-105",
                    hasApiKey 
                      ? "bg-green-50 border-green-200 hover:bg-green-100" 
                      : "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 animate-pulse"
                  )}
                  title={hasApiKey ? "APIキー設定済み" : "APIキーを設定してください"}
              >
                <Key className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                  hasApiKey ? "text-green-500" : "text-yellow-500"
                )} />
              </button>
              )}

              {/* Document count badge */}
              {documents.length > 0 && (
                <button
                  onClick={() => setShowDocs(!showDocs)}
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/80 hover:bg-white rounded-full shadow-sm hover:shadow-md transition-all duration-300 border border-pink-100"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-600">{documents.length}</span>
                </button>
              )}
              
              {/* Upload button */}
              <label className={cn(
                "group relative p-2 sm:p-2.5 bg-white/80 hover:bg-white rounded-full shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 border border-pink-100 hover:border-pink-200 hover:scale-105",
                uploadProgress && "opacity-50 cursor-not-allowed"
              )}>
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500 group-hover:text-pink-600 transition-colors" />
                <input type="file" accept=".txt,.md,.pdf" className="hidden" onChange={handleFileUpload} disabled={!!uploadProgress} />
              </label>
              
              {/* Clear all docs */}
              {documents.length > 0 && (
                <button 
                  onClick={handleClearDocs} 
                  className="group p-2 sm:p-2.5 bg-white/80 hover:bg-red-50 rounded-full shadow-sm hover:shadow-md transition-all duration-300 border border-pink-100 hover:border-red-200 hover:scale-105"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 group-hover:text-red-500 transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Document Panel (Slide down) */}
      <div className={cn(
        "overflow-hidden transition-all duration-500 ease-out",
        showDocs ? "max-h-[450px]" : "max-h-0"
      )}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-lg p-3 sm:p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-pink-500" />
                覚えている資料
              </h3>
              <button onClick={() => setShowDocs(false)} className="p-1 hover:bg-pink-50 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Info Panel */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-100/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-base">📁</span>
                  <span><span className="font-medium text-gray-700">対応形式:</span> PDF, TXT, MD</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-base">📏</span>
                  <span><span className="font-medium text-gray-700">サイズ上限:</span> 10MB/ファイル</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-base">💾</span>
                  <span><span className="font-medium text-gray-700">保存先:</span> ブラウザ内(IndexedDB)</span>
                </div>
                <div className="flex items-center gap-2 text-amber-600">
                  <span className="text-base">⚠️</span>
                  <span className="font-medium">ブラウザデータ消去で削除</span>
                </div>
              </div>
            </div>

            <ul className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {documents.map(doc => (
                <li 
                  key={doc.id} 
                  className="group flex justify-between items-center text-xs sm:text-sm text-gray-600 bg-linear-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 p-2.5 sm:p-3 rounded-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                      <FileText className="w-4 h-4 text-pink-400" />
                    </div>
                    <span className="truncate font-medium">{doc.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteDoc(doc.id, e)} 
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Progress Banner */}
      {uploadProgress && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="relative overflow-hidden bg-linear-to-r from-pink-500 to-purple-500 rounded-xl shadow-lg">
            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
            <div className="relative px-4 py-3 text-white text-sm font-medium text-center">
              {uploadProgress}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 sm:space-y-6 pb-32 lg:pb-28">
          {messages.map((msg, i) => {
            // Skip rendering empty assistant messages (streaming placeholder)
            if (msg.role === 'assistant' && msg.content === '') return null;
            
            return (
            <div
              key={i}
              className={cn(
                "flex items-end gap-2 sm:gap-3",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {/* Avatar for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="shrink-0 mb-1">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-linear-to-r from-pink-300 to-purple-300 rounded-full blur opacity-40"></div>
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                      <Character emotion={loading && i === messages.length - 1 ? "thinking" : "happy"} size="sm" />
                    </div>
                  </div>
                </div>
              )}
              
              <div
                className={cn(
                  "group relative max-w-[80%] sm:max-w-[75%] lg:max-w-[70%] transition-all duration-300 hover:shadow-lg",
                  msg.role === 'assistant' 
                    ? "bg-white/90 backdrop-blur-sm text-gray-800 rounded-2xl rounded-bl-md shadow-md border border-pink-100/50" 
                    : "bg-linear-to-br from-pink-500 to-purple-500 text-white rounded-2xl rounded-br-md shadow-md"
                )}
              >
                <div className="p-4 sm:p-5">
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-900 prose-table:text-gray-800 prose-a:text-pink-500 prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                
                {/* Source citations */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-pink-100 pt-3">
                      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        参考資料
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <button
                            key={idx}
                            onClick={async () => {
                              if (source.hasPdf && source.pageNumber) {
                                // Open PDF viewer at specific page
                                const docData = await getDocumentContent(source.docId);
                                if (docData?.pdfBlob) {
                                  setPdfViewer({
                                    pdfBlob: docData.pdfBlob,
                                    title: source.docTitle,
                                    initialPage: source.pageNumber
                                  });
                                }
                              } else {
                                // Open text document viewer
                                setViewingDoc({ 
                                  docId: source.docId, 
                                  highlight: source.chunkContent,
                                  pageNumber: source.pageNumber
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-linear-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-pink-600 rounded-lg border border-pink-200 hover:border-pink-300 transition-all duration-200 hover:shadow-sm"
                            title={source.pageNumber ? `${source.docTitle} - p.${source.pageNumber}` : source.docTitle}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{source.docTitle}</span>
                            {source.pageNumber && (
                              <span className="text-pink-400 font-medium">
                                p.{source.pageStart !== source.pageEnd && source.pageEnd 
                                  ? `${source.pageStart}-${source.pageEnd}` 
                                  : source.pageNumber}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {msg.role === 'assistant' && (
                  <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={() => speak(msg.content)}
                      className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl border border-pink-100 hover:border-pink-200 transition-all duration-300 hover:scale-110"
                    >
                      <Volume2 className="w-4 h-4 text-pink-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
          
          {/* Loading indicator - only show when loading and last message is empty or no assistant response yet */}
          {loading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant' || messages[messages.length - 1]?.content === '') && (
            <div className="flex items-end gap-2 sm:gap-3 justify-start">
              {/* Avatar */}
              <div className="shrink-0 mb-1">
                <div className="relative">
                  <div className="absolute -inset-1 bg-linear-to-r from-pink-300 to-purple-300 rounded-full blur opacity-40 animate-pulse"></div>
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                    <Character emotion="thinking" size="sm" />
                  </div>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-bl-md shadow-md border border-pink-100/50 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-400 ml-2">
                    {loadingStatus === "searching" && "📚 資料を検索中..."}
                    {loadingStatus === "thinking" && "🐶 考え中..."}
                    {!loadingStatus && "考え中..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="bg-linear-to-t from-white via-white/95 to-transparent pt-6 pb-safe">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-pink-100/50">
                
                {/* Mic button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "relative shrink-0 p-2.5 sm:p-3 rounded-xl transition-all duration-300 hover:scale-105",
                    isRecording 
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  )}
                >
                  {isRecording && (
                    <div className="absolute inset-0 bg-red-500 rounded-xl animate-ping opacity-30"></div>
                  )}
                  <Mic className="relative w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                
                {/* Input field */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRecording ? "聞いています..." : "質問を入力してね 🐾"}
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-gray-400"
                />
                
                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className={cn(
                    "relative shrink-0 p-2.5 sm:p-3 rounded-xl transition-all duration-300 hover:scale-105",
                    input.trim() && !loading
                      ? "bg-linear-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
