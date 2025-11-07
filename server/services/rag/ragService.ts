import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { EmbeddingService } from "./embeddingService";
import { VectorStore } from "./vectorStore";
import {
  QaChunk,
  SearchResult,
  RagResponse,
  EmbeddingConfig,
  SearchConfig,
} from "./types";

export class RagService {
  private llm: ChatOpenAI;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private embeddingConfig: EmbeddingConfig;
  private searchConfig: SearchConfig;

  constructor(embeddingConfig: EmbeddingConfig, searchConfig: SearchConfig) {
    this.embeddingConfig = embeddingConfig;
    this.searchConfig = searchConfig;

    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.embeddingService = new EmbeddingService(embeddingConfig);
    this.vectorStore = new VectorStore(searchConfig);
  }

  /**
   * Initialize the RAG system
   */
  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
    console.log("RAG system initialized successfully");
  }

  /**
   * Process and store QA data in the vector store
   */
  async processAndStoreQaData(
    qaData: Array<{
      id: number;
      question: string;
      answer: string;
      category?: string;
      source: string;
    }>,
  ): Promise<void> {
    console.log(`Processing ${qaData.length} QA entries...`);

    // Process QA data into chunks with embeddings
    const chunks = await this.embeddingService.processQaData(qaData);

    // Store chunks in vector store
    await this.vectorStore.storeChunks(chunks);

    console.log(`Successfully processed and stored ${chunks.length} chunks`);
  }

  /**
   * Generate answer using RAG
   */
  async generateAnswer(query: string): Promise<RagResponse> {
    try {
      // Generate embedding for the query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      // Search for relevant chunks
      const searchResults = await this.vectorStore.hybridSearch(
        query,
        queryEmbedding,
        { topK: 5, similarityThreshold: 0.7 },
      );
      // Create context from search results
      const context = this.buildContext(searchResults);

      // Generate answer using LLM
      const answer = await this.generateAnswerWithContext(query, context);

      // Calculate confidence based on search scores
      const confidence = this.calculateConfidence(searchResults);

      return {
        answer,
        sources: searchResults,
        confidence,
        query,
      };
    } catch (error) {
      console.error("Error generating RAG answer:", error);
      throw error;
    }
  }

  /**
   * Generate answer using RAG with streaming
   */
  async *generateAnswerStream(query: string) {
    try {
      // Generate embedding for the query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      // Search for relevant chunks
      const searchResults = await this.vectorStore.hybridSearch(
        query,
        queryEmbedding,
        { topK: 5, similarityThreshold: 0.7 },
      );

      // Create context from search results
      const context = this.buildContext(searchResults);

      // Calculate confidence based on search scores
      const confidence = this.calculateConfidence(searchResults);

      // Send metadata first
      yield {
        type: "metadata",
        confidence,
        sources: searchResults.map((result, index) => ({
          chunk: result.chunk,
          score: result.score,
          source: `QA Knowledge Base - Entry ${index + 1}`,
        })),
      };

      // Stream the answer
      yield* this.generateAnswerWithContextStream(query, context);
    } catch (error) {
      console.error("Error generating RAG answer stream:", error);
      yield {
        type: "error",
        error: "Failed to generate answer",
      };
    }
  }

  /**
   * Build context string from search results
   */
  private buildContext(searchResults: SearchResult[]): string {
    return searchResults
      .map((result, index) => {
        const metadata = result.chunk.metadata;
        return `Source ${index + 1} (${metadata.source}):
Question: ${metadata.question}
Content: ${result.chunk.chunkText}
---`;
      })
      .join("\n\n");
  }

  /**
   * Generate answer using LLM with context
   */
  private async generateAnswerWithContext(
    query: string,
    context: string,
  ): Promise<string> {
    //     const promptTemplate = PromptTemplate.fromTemplate(`
    // You are a helpful AI assistant that answers questions based on the provided context and your general knowledge.
    // Use the information from the context when available, and supplement with your general knowledge to provide comprehensive answers.

    // Context:
    // {context}

    // Question: {query}

    // Instructions:
    // 1. Answer the question using the provided context when available
    // 2. If the context doesn't contain enough information, use your general knowledge to provide a helpful answer
    // 3. Never mention that the context is insufficient or that you don't have enough information
    // 4. Be specific and provide detailed information
    // 5. Keep your answer concise but comprehensive
    // 6. If the question is exactly the same as a question in the context, answer it with the answer exactly as it is in the context
    // 7. Sometimes there are repeated questions in the answer, so return only the answer part

    // Answer:`);

    const promptTemplate = PromptTemplate.fromTemplate(`
You are a knowledgeable and empathetic expert on caregiving, including emotional support, medical resources, daily care strategies, legal and financial considerations, and community options for those caring for aging or dependent loved ones. Your goal is to provide practical, actionable guidance that helps users navigate their caregiving queries effectively.
When responding to the user’s query, always base your answer on the provided context from relevant community discussions or resources. If the context doesn’t fully address the query, note any gaps and suggest general next steps without fabricating information.
Structure your response to directly address common follow-up thoughts like: “What do I do with this information? Who can help me? Who is likely to be involved? Where can I find these people or resources?”
Include the following elements in every response:
1. Actionable Plan: Break down practical steps the user can take, tailored to the query and context. Make it step-by-step, realistic, and prioritized.
2. Key Professionals and Stakeholders: Identify relevant experts or individuals who could assist, such as geriatric care managers (also known as Aging Life Care Professionals), elder law attorneys, healthcare providers, certified senior advisors, senior real estate specialists, or family members. Explain their roles briefly and who might be involved in the process (e.g., spouses, social workers, or support groups).
3. Where to Find Help: Suggest reliable ways to locate these professionals, like through professional associations, local networks, or online directories. Provide links to helpful, non-commercial association websites (e.g., alz.org for The Alzheimer’s Association, naela.org for the National Academy of Elder Law Attorneys, whereyoulivematters.org for finding senior living options from the American Seniors Housing Association, leadingage.org for Continuing Care Retirement Communities and Life Plan Communities, mylifesite.net as the authoritative consumer site on CCRCs and Life Plan Communities, or 55places.com for active adult and 55+ communities. For home care questions direct users to https://allianceforcareathome.org/find-a-provider/). Never mention or link to: caring.com, aplaceformom, oasissenioradvisors.com, seniorly.com, elderlifefinancial.com, silverassist.com, or familyassets.com.
4. Experienced Perspective: Offer a general overview of how someone with real-world experience (e.g., a seasoned caregiver or caregiving professional) might approach and respond to the situation, drawing from common best practices in the context.
Keep your tone supportive, clear, and encouraging. Be concise yet comprehensive, and cite specific parts of the context where relevant. Begin your answer with "Hi there." as a greeting and end with a warm, empathetic closing.
Context: {context}
User Query: {query}
`);

    const chain = promptTemplate.pipe(this.llm);

    const response = await chain.invoke({
      context,
      query,
    });

    return response.content as string;
  }

  /**
   * Generate answer using LLM with context (streaming version)
   */
  private async *generateAnswerWithContextStream(
    query: string,
    context: string,
  ) {
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a knowledgeable and empathetic expert on caregiving, including emotional support, medical resources, daily care strategies, legal and financial considerations, and community options for those caring for aging or dependent loved ones. Your goal is to provide practical, actionable guidance that helps users navigate their caregiving queries effectively.
When responding to the user's query, always base your answer on the provided context from relevant community discussions or resources. If the context doesn't fully address the query, note any gaps and suggest general next steps without fabricating information.
Structure your response to directly address common follow-up thoughts like: "What do I do with this information? Who can help me? Who is likely to be involved? Where can I find these people or resources?"
Include the following elements in every response:
1. Actionable Plan: Break down practical steps the user can take, tailored to the query and context. Make it step-by-step, realistic, and prioritized.
2. Key Professionals and Stakeholders: Identify relevant experts or individuals who could assist, such as geriatric care managers (also known as Aging Life Care Professionals), elder law attorneys, healthcare providers, certified senior advisors, senior real estate specialists, or family members. Explain their roles briefly and who might be involved in the process (e.g., spouses, social workers, or support groups).
3. Where to Find Help: Suggest reliable ways to locate these professionals, like through professional associations, local networks, or online directories. Provide links to helpful, non-commercial association websites (e.g., alz.org for The Alzheimer's Association, naela.org for the National Academy of Elder Law Attorneys, whereyoulivematters.org for finding senior living options from the American Seniors Housing Association, leadingage.org for Continuing Care Retirement Communities and Life Plan Communities, mylifesite.net as the authoritative consumer site on CCRCs and Life Plan Communities, or 55places.com for active adult and 55+ communities. For home care questions direct users to https://allianceforcareathome.org/find-a-provider/). Never mention or link to: caring.com, aplaceformom, oasissenioradvisors.com, seniorly.com, elderlifefinancial.com, silverassist.com, or familyassets.com.
4. Experienced Perspective: Offer a general overview of how someone with real-world experience (e.g., a seasoned caregiver or caregiving professional) might approach and respond to the situation, drawing from common best practices in the context.
Keep your tone supportive, clear, and encouraging. Be concise yet comprehensive, and cite specific parts of the context where relevant. Begin your answer with "Hi there." as a greeting and end with a warm, empathetic closing.
Context: {context}
User Query: {query}
`);

    const chain = promptTemplate.pipe(this.llm);

    const stream = await chain.stream({
      context,
      query,
    });

    for await (const chunk of stream) {
      yield {
        type: "content",
        content: chunk.content,
      };
    }
  }

  /**
   * Calculate confidence score based on search results
   */
  private calculateConfidence(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;

    // Calculate average similarity score
    const avgScore =
      searchResults.reduce((sum, result) => sum + result.score, 0) /
      searchResults.length;

    // Normalize to 0-1 range
    return Math.min(Math.max(avgScore, 0), 1);
  }

  /**
   * Search for similar content without generating an answer
   */
  async searchSimilar(
    query: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    return await this.vectorStore.hybridSearch(query, queryEmbedding, {
      topK,
      similarityThreshold: 0.5,
    });
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<{
    totalChunks: number;
    totalQAs: number;
    averageChunksPerQA: number;
  }> {
    return await this.vectorStore.getStats();
  }

  /**
   * Get the vector store instance
   */
  getVectorStore(): VectorStore {
    return this.vectorStore;
  }

  /**
   * Update QA data in the vector store
   */
  async updateQaData(
    qaId: number,
    qaData: {
      question: string;
      answer: string;
      category?: string;
      source: string;
    },
  ): Promise<void> {
    // Delete existing chunks for this QA
    await this.vectorStore.deleteChunksByQaId(qaId);

    // Process and store new chunks
    const chunks = await this.embeddingService.processQaData([
      {
        id: qaId,
        ...qaData,
      },
    ]);

    await this.vectorStore.storeChunks(chunks);
  }

  /**
   * Delete QA data from the vector store
   */
  async deleteQaData(qaId: number): Promise<void> {
    await this.vectorStore.deleteChunksByQaId(qaId);
  }

  /**
   * Test the RAG system with a sample query
   */
  async testRagSystem(): Promise<{
    stats: any;
    sampleQuery: string;
    sampleResponse: RagResponse;
  }> {
    const stats = await this.getStats();

    if (stats.totalChunks === 0) {
      throw new Error("No data available in the vector store for testing");
    }

    const sampleQuery = "What is an ADU and how can it be used for elder care?";
    const sampleResponse = await this.generateAnswer(sampleQuery);

    return {
      stats,
      sampleQuery,
      sampleResponse,
    };
  }
}
