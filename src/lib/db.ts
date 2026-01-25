import { openDB, DBSchema } from "idb";

interface RagDB extends DBSchema {
  documents: {
    key: string;
    value: {
      id: string;
      content: string; // Original full content
      title: string;
      createdAt: number;
      fileType?: "pdf" | "text" | "markdown";
      pdfBlob?: Blob; // Store PDF file for viewing
    };
    indexes: { "by-title": string };
  };
  chunks: {
    key: string;
    value: {
        id: string;
        docId: string;
        content: string; // Chunk content
        embedding: number[];
        pageNumber?: number; // PDF page number
        pageStart?: number; // Starting page for this chunk
        pageEnd?: number; // Ending page for this chunk
    };
    indexes: { "by-docId": string };
  };
}

const DB_NAME = "ai-teacher-db";
const STORE_DOCS = "documents";
const STORE_CHUNKS = "chunks";

export async function initDB() {
  const db = await openDB<RagDB>(DB_NAME, 3, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const store = db.createObjectStore(STORE_DOCS, {
          keyPath: "id",
        });
        store.createIndex("by-title", "title");
      }
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        const store = db.createObjectStore(STORE_CHUNKS, {
            keyPath: "id",
        });
        store.createIndex("by-docId", "docId");
      }
    },
  });
  return db;
}

export interface SaveDocumentOptions {
  title: string;
  content: string;
  fileType?: "pdf" | "text" | "markdown";
  pdfBlob?: Blob;
}

export async function saveDocument(options: SaveDocumentOptions): Promise<string>;
export async function saveDocument(title: string, content: string): Promise<string>;
export async function saveDocument(
  titleOrOptions: string | SaveDocumentOptions, 
  contentArg?: string
): Promise<string> {
  const db = await initDB();
  const id = crypto.randomUUID();
  
  if (typeof titleOrOptions === 'string') {
    // Legacy call: saveDocument(title, content)
    await db.put(STORE_DOCS, {
      id,
      title: titleOrOptions,
      content: contentArg!,
      createdAt: Date.now(),
    });
  } else {
    // New call: saveDocument({ title, content, fileType, pdfBlob })
    await db.put(STORE_DOCS, {
      id,
      title: titleOrOptions.title,
      content: titleOrOptions.content,
      createdAt: Date.now(),
      fileType: titleOrOptions.fileType,
      pdfBlob: titleOrOptions.pdfBlob,
    });
  }
  
  return id;
}

export interface ChunkData {
    content: string;
    embedding: number[];
    pageNumber?: number;
    pageStart?: number;
    pageEnd?: number;
}

export async function saveChunks(docId: string, chunks: ChunkData[]) {
    const db = await initDB();
    const tx = db.transaction(STORE_CHUNKS, 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);
    
    for (const chunk of chunks) {
        await store.put({
            id: crypto.randomUUID(),
            docId,
            content: chunk.content,
            embedding: chunk.embedding,
            pageNumber: chunk.pageNumber,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd
        });
    }
    await tx.done;
}

export async function getAllDocuments() {
  const db = await initDB();
  return await db.getAll(STORE_DOCS);
}

export async function getAllChunks() {
    const db = await initDB();
    return await db.getAll(STORE_CHUNKS);
}

export async function getDocument(docId: string) {
    const db = await initDB();
    return await db.get(STORE_DOCS, docId);
}

export async function getChunksWithDocInfo() {
    const db = await initDB();
    const chunks = await db.getAll(STORE_CHUNKS);
    const docs = await db.getAll(STORE_DOCS);
    
    const docMap = new Map(docs.map(d => [d.id, d]));
    
    return chunks.map(chunk => {
        const doc = docMap.get(chunk.docId);
        return {
            ...chunk,
            docTitle: doc?.title || "不明なドキュメント",
            hasPdf: doc?.fileType === "pdf" && !!doc?.pdfBlob
        };
    });
}

export async function deleteDocument(docId: string) {
    const db = await initDB();
    
    // Delete chunks first
    const tx = db.transaction([STORE_DOCS, STORE_CHUNKS], 'readwrite');
    const chunkStore = tx.objectStore(STORE_CHUNKS);
    const docStore = tx.objectStore(STORE_DOCS);

    const index = chunkStore.index('by-docId');
    let cursor = await index.openCursor(IDBKeyRange.only(docId));

    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    // Delete doc
    await docStore.delete(docId);
    
    await tx.done;
}

export async function clearDocuments() {
    const db = await initDB();
    await db.clear(STORE_DOCS);
    await db.clear(STORE_CHUNKS);
}
