import 'dotenv/config';
import { initializeRagSystem, testRagSystem, generateRagAnswer, getRagStats } from '../services/rag';

async function main() {
  try {
    console.log('🚀 Starting RAG System Test...\n');

    // Check if OPENAI_API_KEY is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Initialize the RAG system
    console.log('📚 Initializing RAG system and loading data...');
    await initializeRagSystem();
    console.log('✅ RAG system initialized successfully!\n');

    // Get statistics
    console.log('📊 Getting system statistics...');
    const stats = await getRagStats();
    console.log('Vector Store Statistics:', stats);
    console.log('');

    // Test the system
    console.log('🧪 Testing RAG system...');
    await testRagSystem();
    console.log('');

    // Test some sample queries
    const testQueries = [
      "What is an ADU and how can it be used for elder care?",
      "How much does it typically cost to build an ADU?",
      "What are the zoning requirements for ADUs?",
      "How can I make an ADU accessible for someone with mobility issues?",
      "What are the maintenance responsibilities for an ADU?"
    ];

    console.log('🔍 Testing sample queries...\n');

    for (const query of testQueries) {
      console.log(`Query: ${query}`);
      console.log('─'.repeat(50));

      const response = await generateRagAnswer(query);

      console.log(`Answer: ${response.answer.substring(0, 200)}...`);
      console.log(`Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      console.log(`Sources: ${response.sources.length}`);
      console.log('');
    }

    console.log('🎉 RAG system test completed successfully!');

  } catch (error) {
    console.error('❌ Error during RAG system test:', error);
    process.exit(1);
  }
}

main();
