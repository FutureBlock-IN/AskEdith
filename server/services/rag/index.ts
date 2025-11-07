// Export all RAG services and types
import "dotenv/config";
import { RagService } from "./ragService";
import { EmbeddingService } from "./embeddingService";
import { VectorStore } from "./vectorStore";
import { DataIngestionService } from "./dataIngestion";
import type {
  EmbeddingConfig,
  SearchConfig,
  QaChunk,
  SearchResult,
} from "./types";

export { RagService, EmbeddingService, VectorStore, DataIngestionService };
export type { EmbeddingConfig, SearchConfig, QaChunk, SearchResult };

// Default configuration
export const DEFAULT_EMBEDDING_CONFIG = {
  model: "text-embedding-3-small",
  dimension: 1536,
  chunkSize: 512,
  chunkOverlap: 50,
} as const;

export const DEFAULT_SEARCH_CONFIG = {
  topK: 5,
  similarityThreshold: 0.7,
  includeMetadata: true,
} as const;

// Singleton instance for easy access
let ragServiceInstance: RagService | null = null;
let dataIngestionInstance: DataIngestionService | null = null;

/**
 * Get or create a singleton RAG service instance
 */
export function getRagService(): RagService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RagService(
      DEFAULT_EMBEDDING_CONFIG,
      DEFAULT_SEARCH_CONFIG,
    );
  }
  return ragServiceInstance;
}

/**
 * Get or create a singleton data ingestion service instance
 */
export function getDataIngestionService(): DataIngestionService {
  if (!dataIngestionInstance) {
    dataIngestionInstance = new DataIngestionService();
  }
  return dataIngestionInstance;
}

/**
 * Initialize the RAG system with data ingestion
 */
export async function initializeRagSystem(): Promise<void> {
  const dataIngestion = getDataIngestionService();
  console.log("Clearing vector store...");
  await dataIngestion.clearVectorStore();
  console.log("Initializing RAG system...");
  await dataIngestion.initializeAndLoadData();
}

/**
 * Test the RAG system
 */
export async function testRagSystem(): Promise<void> {
  const dataIngestion = getDataIngestionService();
  await dataIngestion.testLoadedData();
}

/**
 * Generate an answer using RAG
 */
export async function generateRagAnswer(query: string) {
  const ragService = getRagService();
  return await ragService.generateAnswer(query);
}

/**
 * Generate an answer using RAG with streaming
 */
export async function* generateRagAnswerStream(query: string) {
  const ragService = getRagService();
  yield* ragService.generateAnswerStream(query);
}

/**
 * Search for similar content
 */
export async function searchSimilarContent(query: string, topK: number = 5) {
  const ragService = getRagService();
  return await ragService.searchSimilar(query, topK);
}

/**
 * Get RAG system statistics
 */
export async function getRagStats() {
  const ragService = getRagService();
  return await ragService.getStats();
}
