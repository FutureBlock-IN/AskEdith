# RAG (Retrieval-Augmented Generation) System

This directory contains a complete RAG system implementation using LangChain, OpenAI GPT-4o-mini, and PGVector for semantic search and answer generation.

## Architecture

```
server/services/rag/
├── types.ts              # TypeScript interfaces and types
├── embeddingService.ts   # OpenAI embeddings generation
├── vectorStore.ts        # PGVector database operations
├── ragService.ts         # Main RAG orchestration
├── dataIngestion.ts      # CSV data processing
├── index.ts             # Main exports and utilities
└── README.md            # This file
```

## Features

- **Semantic Search**: Vector similarity search using OpenAI embeddings
- **Hybrid Search**: Combines vector similarity with keyword matching
- **Context-Aware Answers**: Generates answers using relevant context from your CSV data
- **Source Attribution**: Provides source information for generated answers
- **Confidence Scoring**: Calculates confidence based on search relevance
- **Batch Processing**: Efficient processing of large CSV datasets
- **Admin Management**: API endpoints for system management

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Setup

Use Drizzle's migration system to create the required tables and indexes:

```bash
npm run db:push
```

This will create:
- `qa_embeddings` table with PGVector support
- Similarity search index for fast vector queries
- Foreign key relationships with existing `qa_knowledge` table
- Proper Drizzle schema integration

### 3. Dependencies

The system uses these packages (already installed):

```bash
npm install langchain @langchain/openai @langchain/community pgvector
```

## Usage

### Basic Usage

```typescript
import { generateRagAnswer, initializeRagSystem } from './services/rag';

// First, ensure the database schema is up to date
// npm run db:push

// Initialize the system (one-time setup)
await initializeRagSystem();

// Generate an answer
const response = await generateRagAnswer("What is an ADU?");
console.log(response.answer);
console.log(`Confidence: ${response.confidence}`);
```

### API Endpoints

#### RAG Search
```http
POST /api/rag-search
Content-Type: application/json

{
  "query": "What is an ADU and how can it be used for elder care?"
}
```

Response:
```json
{
  "answer": "An ADU (Accessory Dwelling Unit) is a smaller, self-contained living space...",
  "confidence": 0.85,
  "sources": [
    {
      "question": "What is an ADU, and how can it be used for elder care?",
      "content": "An Accessory Dwelling Unit (ADU) is a smaller, self-contained...",
      "score": 0.92,
      "source": "improved_qa_results_database.csv"
    }
  ],
  "totalSources": 3
}
```

#### Admin Endpoints

Initialize RAG system:
```http
POST /api/rag/initialize
Authorization: Bearer <admin_token>
```

Get system stats:
```http
GET /api/rag/stats
Authorization: Bearer <admin_token>
```

Test system:
```http
POST /api/rag/test
Authorization: Bearer <admin_token>
```

### Testing

Run the test script:

```bash
npm run rag:test
```

## Configuration

### Embedding Configuration

```typescript
const embeddingConfig = {
  model: 'text-embedding-3-small',  // OpenAI embedding model
  dimension: 1536,                  // Vector dimension
  chunkSize: 512,                   // Text chunk size
  chunkOverlap: 50,                 // Chunk overlap
};
```

### Search Configuration

```typescript
const searchConfig = {
  topK: 5,                          // Number of results to retrieve
  similarityThreshold: 0.7,         // Minimum similarity score
  includeMetadata: true,            // Include metadata in results
};
```

## Data Processing

### CSV Format

The system expects CSV files with these columns:

```csv
question_id,question,answer,category,section,processed_at
1,"What is an ADU?","An ADU is...",General,1.1,2025-07-29
```

### Supported Files

- `data/retirement_qa_results.csv`
- `data/improved_qa_results_database.csv`

### Data Flow

1. **CSV Parsing**: Parse and clean CSV data
2. **Text Chunking**: Split long answers into manageable chunks
3. **Embedding Generation**: Generate vector embeddings for each chunk
4. **Vector Storage**: Store embeddings in PGVector database
5. **Index Creation**: Create similarity search indexes

## Performance

### Optimization Features

- **Batch Processing**: Process multiple embeddings simultaneously
- **Caching**: Embedding generation caching
- **Indexed Search**: Fast similarity search with PGVector indexes
- **Hybrid Search**: Combines vector and keyword search for better results

### Expected Performance

- **Embedding Generation**: ~1000 chunks/minute
- **Search Response**: <500ms for typical queries
- **Memory Usage**: ~50MB for 10,000 chunks
- **Storage**: ~15MB for 10,000 embeddings

## Error Handling

The system includes comprehensive error handling:

- **API Key Validation**: Checks for required environment variables
- **Database Connection**: Graceful handling of connection issues
- **Rate Limiting**: Respects OpenAI API rate limits
- **Fallback Responses**: Provides helpful responses when search fails

## Monitoring

### Logging

The system logs:
- Initialization progress
- Data processing statistics
- Search performance metrics
- Error details

### Statistics

Track system health with:
- Total chunks processed
- Average chunks per QA
- Search success rates
- Response times

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**
   ```
   Error: OPENAI_API_KEY environment variable is required
   ```
   Solution: Add your OpenAI API key to `.env`

2. **Database Connection Issues**
   ```
   Error: Failed to initialize vector store
   ```
   Solution: Check your DATABASE_URL and ensure PGVector extension is available

3. **Memory Issues**
   ```
   Error: Out of memory during embedding generation
   ```
   Solution: Reduce batch size or process data in smaller chunks

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'rag:*';
```

## Security

- **Admin-only Management**: System management requires admin privileges
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Error Sanitization**: Sensitive information is not exposed in error messages

## Future Enhancements

- **Multi-language Support**: Support for non-English content
- **Advanced Filtering**: Filter by category, date, or source
- **Real-time Updates**: Incremental updates without full reprocessing
- **Analytics Dashboard**: Web interface for system monitoring
- **Custom Models**: Support for custom embedding models
