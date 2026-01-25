import { pipeline, PipelineType } from "@xenova/transformers";

// Use a singleton pattern to ensure the pipeline is only loaded once
class EmbeddingPipeline {
  static task: PipelineType = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2"; // Small, English-focused but works ok for simple multilingual, or switch to 'intfloat/multilingual-e5-small' for better JP support if needed. Let's start with a well-known small one. 
  // Actually, 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' is better for Japanese but 4x larger (~120MB). 
  // Let's try 'Xenova/all-MiniLM-L6-v2' first for speed (23MB). If results are bad, we switch.
  // Update: User specifically asked for this, let's use a multilingual one to be safe. "Xenova/bge-m3" is too big.
  // "Xenova/paraphrase-multilingual-MiniLM-L12-v2" is a good balance.
  
  static instance: Promise<any> | null = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = pipeline(this.task, "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
        // @ts-ignore
        quantized: true, 
      });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
