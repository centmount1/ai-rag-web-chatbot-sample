"use client";

import { useEffect, useRef, useState } from "react";

interface PdfViewerProps {
    pdfBlob: Blob;
    title: string;
    initialPage?: number;
    onClose: () => void;
    onSwitchToText?: () => void;
}

export default function PdfViewer({ pdfBlob, title, initialPage = 1, onClose, onSwitchToText }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [numPages, setNumPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1.0);
    const pdfDocRef = useRef<any>(null);

    // Load PDF
    useEffect(() => {
        async function loadPdf() {
            try {
                setLoading(true);
                const pdfjsLib = await import("pdfjs-dist");
                
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }
                
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                
                pdfDocRef.current = pdf;
                setNumPages(pdf.numPages);
                setCurrentPage(Math.min(initialPage, pdf.numPages));
                setLoading(false);
            } catch (err) {
                console.error("Failed to load PDF:", err);
                setError("PDFの読み込みに失敗しました");
                setLoading(false);
            }
        }
        
        loadPdf();
    }, [pdfBlob, initialPage]);

    // Render page
    useEffect(() => {
        async function renderPage() {
            if (!pdfDocRef.current || !canvasRef.current || loading) return;
            
            try {
                const page = await pdfDocRef.current.getPage(currentPage);
                const viewport = page.getViewport({ scale });
                
                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");
                if (!context) return;
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport
                }).promise;
            } catch (err) {
                console.error("Failed to render page:", err);
            }
        }
        
        renderPage();
    }, [currentPage, scale, loading]);

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const goToNextPage = () => {
        if (currentPage < numPages) setCurrentPage(currentPage + 1);
    };

    const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
    const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-[90vw] max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold truncate max-w-md" title={title}>
                        📄 {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        {onSwitchToText && (
                            <button
                                onClick={onSwitchToText}
                                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                📝 テキスト表示
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="閉じる"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-center gap-4 p-2 border-b bg-gray-50">
                    <button
                        onClick={goToPrevPage}
                        disabled={currentPage <= 1}
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                    >
                        ◀ 前
                    </button>
                    <span className="text-sm">
                        ページ {currentPage} / {numPages}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={currentPage >= numPages}
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                    >
                        次 ▶
                    </button>
                    <div className="border-l pl-4 flex items-center gap-2">
                        <button
                            onClick={zoomOut}
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                            title="縮小"
                        >
                            −
                        </button>
                        <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
                        <button
                            onClick={zoomIn}
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                            title="拡大"
                        >
                            +
                        </button>
                    </div>
                    {/* Page jump */}
                    <div className="border-l pl-4 flex items-center gap-2">
                        <label className="text-sm">移動:</label>
                        <input
                            type="number"
                            min={1}
                            max={numPages}
                            value={currentPage}
                            onChange={(e) => {
                                const page = parseInt(e.target.value);
                                if (page >= 1 && page <= numPages) {
                                    setCurrentPage(page);
                                }
                            }}
                            className="w-16 px-2 py-1 border rounded text-center"
                        />
                    </div>
                </div>

                {/* PDF Canvas */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center"
                >
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-gray-500">PDFを読み込み中...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-red-500">{error}</p>
                        </div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            className="shadow-lg"
                            style={{ backgroundColor: "white" }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
