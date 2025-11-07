export interface QaChunk {
  id?: number;
  chunkText: string;
  embedding?: number[];
  metadata: {
    id: number;
    question: string;
    category?: string;
    source: string;
    chunkIndex: number;
    totalChunks: number;
  };
  createdAt?: Date;
}

export interface SearchResult {
  chunk: QaChunk;
  score: number;
  source: string;
}

export interface RagResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  query: string;
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
  chunkSize: number;
  chunkOverlap: number;
}

export interface SearchConfig {
  topK: number;
  similarityThreshold: number;
  includeMetadata: boolean;
}
