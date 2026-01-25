// Client-side RAG logic - uses IndexedDB for storage and server actions for embeddings
import { saveDocument, saveChunks, getAllChunks, getChunksWithDocInfo, getDocument, SaveDocumentOptions, ChunkData } from "./db";
import { generateEmbeddingAction, generateEmbeddingsForChunksAction } from "./rag-actions";
import { extractTextFromPDF, PDFPage } from "./pdf";

const CHUNK_SIZE = 500; // characters

// Source citation type
export interface SourceCitation {
    docId: string;
    docTitle: string;
    chunkContent: string;
    score: number;
    pageNumber?: number; // PDF page number
    pageStart?: number;  // Starting page for chunks spanning multiple pages
    pageEnd?: number;    // Ending page for chunks spanning multiple pages
    hasPdf?: boolean;    // Whether the source has a PDF file stored
}

export interface RetrievalResult {
    context: string;
    sources: SourceCitation[];
}

// Calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Interface for chunk with page info
interface ChunkWithPageInfo {
    content: string;
    pageStart: number;
    pageEnd: number;
}

// Split text into chunks while tracking page numbers
function splitIntoChunksWithPages(pages: PDFPage[], chunkSize: number): ChunkWithPageInfo[] {
    const chunks: ChunkWithPageInfo[] = [];
    let currentChunk = "";
    let currentPageStart = 1;
    let currentPageEnd = 1;
    
    for (const page of pages) {
        const pageText = page.text;
        let remainingText = pageText;
        
        while (remainingText.length > 0) {
            const spaceLeft = chunkSize - currentChunk.length;
            
            if (remainingText.length <= spaceLeft) {
                // Entire remaining text fits in current chunk
                currentChunk += remainingText;
                currentPageEnd = page.pageNumber;
                remainingText = "";
            } else {
                // Fill current chunk and start new one
                currentChunk += remainingText.slice(0, spaceLeft);
                currentPageEnd = page.pageNumber;
                
                chunks.push({
                    content: currentChunk,
                    pageStart: currentPageStart,
                    pageEnd: currentPageEnd
                });
                
                currentChunk = "";
                currentPageStart = page.pageNumber;
                remainingText = remainingText.slice(spaceLeft);
            }
        }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
        chunks.push({
            content: currentChunk,
            pageStart: currentPageStart,
            pageEnd: currentPageEnd
        });
    }
    
    return chunks;
}

export async function processAndSaveDocument(title: string, content: string, onProgress?: (status: string) => void) {
    onProgress?.("ドキュメントを保存中...");
    const docId = await saveDocument(title, content);

    onProgress?.("チャンクに分割中...");
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        chunks.push(content.slice(i, i + CHUNK_SIZE));
    }

    onProgress?.("埋め込みを生成中...（初回は時間がかかる場合があります）");
    
    // Call server action to generate embeddings
    const embeddings = await generateEmbeddingsForChunksAction(chunks);
    
    const chunksWithEmbeddings: ChunkData[] = chunks.map((content, i) => ({
        content,
        embedding: embeddings[i]
    }));

    onProgress?.("ベクトルを保存中...");
    await saveChunks(docId, chunksWithEmbeddings);
    
    onProgress?.("完了！");
}

// Process PDF file with page tracking
export async function processAndSavePDF(file: File, onProgress?: (status: string) => void) {
    onProgress?.("PDFを解析中...");
    const pdfResult = await extractTextFromPDF(file);
    
    onProgress?.("PDFを保存中...");
    const docOptions: SaveDocumentOptions = {
        title: file.name,
        content: pdfResult.fullText,
        fileType: "pdf",
        pdfBlob: file // Store the original PDF file
    };
    const docId = await saveDocument(docOptions);
    
    onProgress?.("チャンクに分割中（ページ情報付き）...");
    const chunksWithPages = splitIntoChunksWithPages(pdfResult.pages, CHUNK_SIZE);
    
    onProgress?.("埋め込みを生成中...（初回は時間がかかる場合があります）");
    const chunkContents = chunksWithPages.map(c => c.content);
    const embeddings = await generateEmbeddingsForChunksAction(chunkContents);
    
    const chunksWithEmbeddings: ChunkData[] = chunksWithPages.map((chunk, i) => ({
        content: chunk.content,
        embedding: embeddings[i],
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        pageNumber: chunk.pageStart // Primary page
    }));
    
    onProgress?.("ベクトルを保存中...");
    await saveChunks(docId, chunksWithEmbeddings);
    
    onProgress?.("完了！");
}

export async function retrieveContext(query: string): Promise<RetrievalResult> {
    const chunks = await getChunksWithDocInfo();
    if (!chunks || chunks.length === 0) return { context: "", sources: [] };

    // Generate query embedding via server action
    const queryEmbedding = await generateEmbeddingAction(query);

    // Calculate scores
    const scoredChunks = chunks.map(chunk => ({
        docId: chunk.docId,
        docTitle: chunk.docTitle,
        content: chunk.content,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
        pageNumber: (chunk as any).pageNumber,
        pageStart: (chunk as any).pageStart,
        pageEnd: (chunk as any).pageEnd,
        hasPdf: (chunk as any).hasPdf
    }));

    // Sort by score desc and take top 3
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 3);
    
    const context = topChunks.map(c => c.content).join("\n---\n");
    const sources: SourceCitation[] = topChunks.map(c => ({
        docId: c.docId,
        docTitle: c.docTitle,
        chunkContent: c.content,
        score: c.score,
        pageNumber: c.pageNumber,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        hasPdf: c.hasPdf
    }));

    return { context, sources };
}

// Get full document content by ID
export async function getDocumentContent(docId: string): Promise<{ title: string; content: string; fileType?: string; pdfBlob?: Blob } | null> {
    const doc = await getDocument(docId);
    if (!doc) return null;
    return { 
        title: doc.title, 
        content: doc.content,
        fileType: doc.fileType,
        pdfBlob: doc.pdfBlob
    };
}
