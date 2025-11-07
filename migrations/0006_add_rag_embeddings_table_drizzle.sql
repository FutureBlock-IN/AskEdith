-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create qa_embeddings table for RAG system
CREATE TABLE IF NOT EXISTS "qa_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"qa_id" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" text,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE "qa_embeddings" ADD CONSTRAINT "qa_embeddings_qa_id_qa_knowledge_id_fk" FOREIGN KEY ("qa_id") REFERENCES "qa_knowledge"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes
CREATE INDEX IF NOT EXISTS "qa_embeddings_qa_id_idx" ON "qa_embeddings" ("qa_id");

-- Convert embedding column to vector type
ALTER TABLE "qa_embeddings" ALTER COLUMN "embedding" TYPE vector(1536) USING embedding::vector(1536);

-- Create vector similarity index
CREATE INDEX IF NOT EXISTS "qa_embeddings_vector_idx"
ON "qa_embeddings"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comments
COMMENT ON TABLE "qa_embeddings" IS 'Stores text chunks and their embeddings for RAG (Retrieval-Augmented Generation) system';
COMMENT ON COLUMN "qa_embeddings"."embedding" IS 'OpenAI text-embedding-3-small vector representation (1536 dimensions)';
COMMENT ON COLUMN "qa_embeddings"."metadata" IS 'JSON containing question, category, source, chunk index, and total chunks info';
