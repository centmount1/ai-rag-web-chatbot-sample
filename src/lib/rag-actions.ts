"use server";

import { generateEmbedding } from "./embeddings";

// Server action that only generates embeddings
// DB operations must happen on the client (IndexedDB is browser-only)
export async function generateEmbeddingAction(text: string): Promise<number[]> {
    return await generateEmbedding(text);
}

// Generate embeddings for multiple chunks
export async function generateEmbeddingsForChunksAction(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        embeddings.push(embedding);
    }
    return embeddings;
}
