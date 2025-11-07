import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RagService } from './ragService';
import { EmbeddingConfig, SearchConfig } from './types';

export interface CsvQaData {
  id: number;
  question: string;
  answer: string;
  category?: string;
  source: string;
}

export class DataIngestionService {
  private ragService: RagService;

  constructor() {
    const embeddingConfig: EmbeddingConfig = {
      model: 'text-embedding-3-small',
      dimension: 1536,
      chunkSize: 512,
      chunkOverlap: 50,
    };

    const searchConfig: SearchConfig = {
      topK: 5,
      similarityThreshold: 0.7,
      includeMetadata: true,
    };

    this.ragService = new RagService(embeddingConfig, searchConfig);
  }

  /**
   * Parse CSV file and return structured data
   */
  async parseCsvFile(filePath: string, source: string): Promise<CsvQaData[]> {
    return new Promise((resolve, reject) => {
      const results: CsvQaData[] = [];
      let idCounter = 1;

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          // Handle different CSV formats
          const question = record.question || record.Question || '';
          const answer = record.answer || record.Answer || '';
          const category = record.category || record.Category || record.section || '';

          if (question && answer) {
            results.push({
              id: idCounter++,
              question: this.cleanText(question),
              answer: this.cleanText(answer),
              category: this.cleanText(category),
              source,
            });
          }
        }
      });

      parser.on('error', (err) => {
        reject(err);
      });

      parser.on('end', () => {
        resolve(results);
      });

      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        parser.write(fileContent);
        parser.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Load data from both CSV files
   */
  async loadAllCsvData(): Promise<CsvQaData[]> {
    const dataDir = join(process.cwd(), 'data');

    try {
      // Load retirement QA data
      const retirementData = await this.parseCsvFile(
        join(dataDir, 'retirement_qa_results.csv'),
        'retirement_qa_results.csv'
      );

      // Load improved QA data
      const improvedData = await this.parseCsvFile(
        join(dataDir, 'improved_qa_results_database.csv'),
        'improved_qa_results_database.csv'
      );

      // Combine and deduplicate data
      const combinedData = [...retirementData, ...improvedData];
      const uniqueData = this.deduplicateData(combinedData);

      console.log(`Loaded ${uniqueData.length} unique QA entries`);
      console.log(`- Retirement data: ${retirementData.length} entries`);
      console.log(`- Improved data: ${improvedData.length} entries`);
      console.log(`- Duplicates removed: ${combinedData.length - uniqueData.length} entries`);

      return uniqueData;
    } catch (error) {
      console.error('Error loading CSV data:', error);
      throw error;
    }
  }

  /**
   * Remove duplicate entries based on question similarity
   */
  private deduplicateData(data: CsvQaData[]): CsvQaData[] {
    const seen = new Set<string>();
    const unique: CsvQaData[] = [];

    for (const item of data) {
      // Create a normalized key for comparison
      const normalizedQuestion = item.question
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!seen.has(normalizedQuestion)) {
        seen.add(normalizedQuestion);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Initialize RAG system and load all data
   */
  async initializeAndLoadData(): Promise<void> {
    try {
      console.log('Initializing RAG system...');
      await this.ragService.initialize();

      console.log('Loading CSV data...');
      const qaData = await this.loadAllCsvData();

      console.log('Processing and storing data in vector store...');
      await this.ragService.processAndStoreQaData(qaData);

      console.log('Data ingestion completed successfully!');

      // Get and display statistics
      const stats = await this.ragService.getStats();
      console.log('Vector store statistics:', stats);
    } catch (error) {
      console.error('Error during data ingestion:', error);
      throw error;
    }
  }

  /**
   * Test the loaded data with a sample query
   */
  async testLoadedData(): Promise<void> {
    try {
      console.log('Testing RAG system with sample query...');
      const testResult = await this.ragService.testRagSystem();

      console.log('\n=== RAG System Test Results ===');
      console.log('Vector Store Stats:', testResult.stats);
      console.log('\nSample Query:', testResult.sampleQuery);
      console.log('\nGenerated Answer:', testResult.sampleResponse.answer);
      console.log('\nConfidence Score:', testResult.sampleResponse.confidence);
      console.log('\nSources Used:', testResult.sampleResponse.sources.length);

      testResult.sampleResponse.sources.forEach((source, index) => {
        console.log(`\nSource ${index + 1}:`);
        console.log(`- Score: ${source.score.toFixed(3)}`);
        console.log(`- Question: ${source.chunk.metadata.question}`);
        console.log(`- Source: ${source.source}`);
      });
    } catch (error) {
      console.error('Error testing RAG system:', error);
      throw error;
    }
  }

  /**
   * Clear the vector store
   */
  async clearVectorStore(): Promise<void> {
    try {
      await this.ragService.getVectorStore().clearVectorStore();
    } catch (error) {
      console.error('Error clearing vector store:', error);
      throw error;
    }
  }

  /**
   * Get the RAG service instance
   */
  getRagService(): RagService {
    return this.ragService;
  }
}
