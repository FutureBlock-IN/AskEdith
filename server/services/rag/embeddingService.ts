import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { QaChunk, EmbeddingConfig } from './types';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
    this.embeddings = new OpenAIEmbeddings({
      modelName: config.model,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
    });
  }

  /**
   * Split text into chunks for embedding
   */
  async splitText(text: string): Promise<string[]> {
    return await this.textSplitter.splitText(text);
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await this.embeddings.embedDocuments(texts);
    return embeddings;
  }

  /**
   * Process QA data and create chunks with embeddings
   */
  async processQaData(qaData: Array<{
    id: number;
    question: string;
    answer: string;
    category?: string;
    source: string;
  }>): Promise<QaChunk[]> {
    const chunks: QaChunk[] = [];

    for (const qa of qaData) {
      // Combine question and answer for context
      const fullText = `Question: ${qa.question}\n\nAnswer: ${qa.answer}`;

      // Split into chunks
      // const textChunks = await this.splitText(fullText);

      // Generate embeddings for all chunks
      const embedding = await this.generateEmbedding(fullText);

      // // Create chunk objects
      // for (let i = 0; i < textChunks.length; i++) {

      // }

      chunks.push({
        chunkText: fullText,
        embedding: embedding,
        metadata: {
          id: qa.id,
          question: qa.question,
          category: qa.category,
          source: qa.source,
          chunkIndex: 0,
          totalChunks: 1,
        },
      });
    }

    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }
}
