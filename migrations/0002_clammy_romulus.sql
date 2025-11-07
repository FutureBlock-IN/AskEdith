ALTER TABLE "qa_embeddings" DROP CONSTRAINT "qa_embeddings_qa_id_qa_knowledge_id_fk";
--> statement-breakpoint
DROP INDEX "qa_embeddings_qa_id_idx";--> statement-breakpoint
ALTER TABLE "qa_embeddings" DROP COLUMN "qa_id";