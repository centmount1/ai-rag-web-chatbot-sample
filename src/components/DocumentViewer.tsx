"use client";

import { useState, useEffect } from "react";
import { X, FileText, FileImage } from "lucide-react";
import { getDocumentContent } from "@/lib/rag";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PdfViewer from "./PdfViewer";

interface DocumentViewerProps {
  docId: string | null;
  highlightText?: string;
  pageNumber?: number;
  onClose: () => void;
}

type ViewMode = "pdf" | "text";

interface DocumentData {
  title: string;
  content: string;
  fileType?: string;
  pdfBlob?: Blob;
}

export function DocumentViewer({ docId, highlightText, pageNumber, onClose }: DocumentViewerProps) {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("pdf");

  useEffect(() => {
    if (docId) {
      setLoading(true);
      getDocumentContent(docId)
        .then(doc => {
          setDocument(doc);
          // PDFがある場合はPDFモード、なければテキストモード
          if (doc?.fileType === "pdf" && doc?.pdfBlob) {
            setViewMode("pdf");
          } else {
            setViewMode("text");
          }
        })
        .finally(() => setLoading(false));
    } else {
      setDocument(null);
    }
  }, [docId]);

  if (!docId) return null;

  const hasPdf = document?.fileType === "pdf" && document?.pdfBlob;

  // PDFモードの場合はPdfViewerを表示
  if (viewMode === "pdf" && hasPdf && document.pdfBlob) {
    return (
      <PdfViewer
        pdfBlob={document.pdfBlob}
        title={document.title}
        initialPage={pageNumber || 1}
        onClose={onClose}
        onSwitchToText={() => setViewMode("text")}
      />
    );
  }

  // Highlight the matching text in content
  const highlightContent = (content: string, highlight?: string) => {
    if (!highlight || highlight.length < 20) return content;
    
    // Find the position of the highlight text
    const index = content.indexOf(highlight.substring(0, 50));
    if (index === -1) return content;
    
    // Return content with marker
    const before = content.substring(0, index);
    const match = content.substring(index, index + highlight.length);
    const after = content.substring(index + highlight.length);
    
    return `${before}<mark class="bg-yellow-200 px-1 rounded">${match}</mark>${after}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-pink-500 to-purple-500 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white truncate">
                {loading ? "読み込み中..." : document?.title || "ドキュメント"}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* PDFモード切替ボタン */}
              {hasPdf && (
                <button
                  onClick={() => setViewMode("pdf")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white text-sm font-medium"
                >
                  <FileImage className="w-4 h-4" />
                  PDF表示
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : document ? (
            <div className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-800 prose-p:text-gray-700">
              {highlightText ? (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: highlightContent(document.content, highlightText)
                      .replace(/\n/g, '<br />') 
                  }} 
                />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {document.content}
                </ReactMarkdown>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">
              ドキュメントが見つかりませんでした
            </p>
          )}
        </div>

        {/* Footer with highlight info */}
        {highlightText && (
          <div className="border-t border-gray-100 px-6 py-3 bg-yellow-50 shrink-0">
            <p className="text-xs text-yellow-700">
              💡 黄色でハイライトされた部分が回答に使用された箇所です
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
