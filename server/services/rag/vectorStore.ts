import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { qaEmbeddings, type QaEmbeddings } from '@shared/schema';
import { QaChunk, SearchResult, SearchConfig } from './types';

export class VectorStore {
  private config: SearchConfig;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  /**
   * Initialize the vector store (verify tables and indexes exist)
   */
  async initialize(): Promise<void> {
    try {
      // Verify the table exists by trying to query it
      await db.select({ id: qaEmbeddings.id }).from(qaEmbeddings).limit(1);
      console.log('Vector store initialized successfully');
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw new Error('qa_embeddings table not found. Please run "npm run db:push" first.');
    }
  }

  /**
   * Store chunks with embeddings in the database
   */
  async storeChunks(chunks: QaChunk[]): Promise<void> {
    try {
      const embeddingsToInsert = chunks.map(chunk => ({
        chunkText: chunk.chunkText,
        embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        metadata: chunk.metadata
      }));

      await db.insert(qaEmbeddings).values(embeddingsToInsert);
      console.log(`Stored ${chunks.length} chunks in vector store`);
    } catch (error) {
      console.error('Error storing chunks:', error);
      throw error;
    }
  }

  /**
   * Search for similar chunks using vector similarity
   */
  async similaritySearch(
    queryEmbedding: number[],
    config?: Partial<SearchConfig>
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.config, ...config };

    try {
      const results = await db.execute(sql`
        SELECT
          id,
          chunk_text,
          metadata,
          1 - (embedding::vector <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity_score
        FROM qa_embeddings
        WHERE 1 - (embedding::vector <=> ${JSON.stringify(queryEmbedding)}::vector) > ${searchConfig.similarityThreshold}
        ORDER BY embedding::vector <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${searchConfig.topK}
      `);

      return results.rows.map((row: any) => ({
        chunk: {
          id: row.id,
          chunkText: row.chunk_text,
          metadata: row.metadata,
        },
        score: row.similarity_score,
        source: row.metadata.source || 'Unknown',
      }));
    } catch (error) {
      console.error('Error in similarity search:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    config?: Partial<SearchConfig>
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.config, ...config };

    try {
      // Perform vector similarity search
      const vectorResults = await this.similaritySearch(queryEmbedding, config);

      // Perform keyword search
      const keywordResults = await db.execute(sql`
        SELECT
          id,
          chunk_text,
          metadata,
          ts_rank(to_tsvector('english', chunk_text), plainto_tsquery('english', ${query})) as keyword_score
        FROM qa_embeddings
        WHERE to_tsvector('english', chunk_text) @@ plainto_tsquery('english', ${query})
        ORDER BY keyword_score DESC
        LIMIT ${searchConfig.topK}
      `);

      // Combine and rank results
      const combinedResults = new Map<number, SearchResult>();

      // Add vector results
      vectorResults.forEach((result, index) => {
        combinedResults.set(result.chunk.id!, {
          ...result,
          score: result.score * 0.7, // Weight vector similarity at 70%
        });
      });

      // Add keyword results
      keywordResults.rows.forEach((row: any, index: number) => {
        const existing = combinedResults.get(row.id);
        if (existing) {
          existing.score += row.keyword_score * 0.3; // Weight keyword matching at 30%
        } else {
          combinedResults.set(row.id, {
            chunk: {
              id: row.id,
              chunkText: row.chunk_text,
              metadata: row.metadata,
            },
            score: row.keyword_score * 0.3,
            source: row.metadata.source || 'Unknown',
          });
        }
      });

      // Sort by combined score and return top results
      return Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, searchConfig.topK);
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Get chunk by ID
   */
  async getChunkById(id: number): Promise<QaChunk | null> {
    try {
      const result = await db
        .select()
        .from(qaEmbeddings)
        .where(sql`${qaEmbeddings.id} = ${id}`)
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id,
        chunkText: row.chunkText,
        metadata: row.metadata as QaChunk['metadata'],
        createdAt: row.createdAt || undefined,
      };
    } catch (error) {
      console.error('Error getting chunk by ID:', error);
      throw error;
    }
  }

  /**
   * Delete chunks by QA ID
   */
  async deleteChunksByQaId(qaId: number): Promise<void> {
    try {
      await db.delete(qaEmbeddings).where(sql`${qaEmbeddings.qaId} = ${qaId}`);
    } catch (error) {
      console.error('Error deleting chunks by QA ID:', error);
      throw error;
    }
  }

  /**
   * Clear all data from the vector store
   */
  async clearVectorStore(): Promise<void> {
    try {
      await db.delete(qaEmbeddings);
      console.log('Vector store cleared successfully');
    } catch (error) {
      console.error('Error clearing vector store:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<{
    totalChunks: number;
    totalQAs: number;
    averageChunksPerQA: number;
  }> {
    try {
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total_chunks,
          COUNT(DISTINCT id) as total_qas,
          ROUND(COUNT(*)::numeric / COUNT(DISTINCT id), 2) as avg_chunks_per_qa
        FROM qa_embeddings
      `);

      const row = stats.rows[0] as any;
      return {
        totalChunks: parseInt(String(row.total_chunks)),
        totalQAs: parseInt(String(row.total_qas)),
        averageChunksPerQA: parseFloat(String(row.avg_chunks_per_qa)),
      };
    } catch (error) {
      console.error('Error getting vector store stats:', error);
      throw error;
    }
  }
}
