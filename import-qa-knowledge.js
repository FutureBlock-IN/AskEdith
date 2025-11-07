const fs = require('fs');
const csv = require('csv-parse/sync');
const { db } = require('./server/db');
const { qaKnowledge } = require('./dist/shared/schema');

async function importQAKnowledge(csvFilePath) {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV - assuming first row is headers
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} Q&A pairs to import`);
    
    let imported = 0;
    let skipped = 0;
    
    // Import each Q&A pair
    for (const record of records) {
      // Get question from Column A and answer from Column B
      // Adjust these field names based on your actual CSV headers
      const question = record['Column A'] || record['Question'] || record['question'] || record.A;
      const answer = record['Column B'] || record['Answer'] || record['answer'] || record.B;
      
      if (!question || !answer) {
        console.log(`Skipping row - missing question or answer`);
        skipped++;
        continue;
      }
      
      try {
        await db.insert(qaKnowledge).values({
          question: question.trim(),
          answer: answer.trim()
        });
        imported++;
        
        if (imported % 10 === 0) {
          console.log(`Progress: ${imported} imported...`);
        }
      } catch (error) {
        console.error(`Error importing Q&A: "${question.substring(0, 50)}..."`, error.message);
        skipped++;
      }
    }
    
    console.log(`\nImport complete!`);
    console.log(`Successfully imported: ${imported} Q&A pairs`);
    console.log(`Skipped: ${skipped} rows`);
    
  } catch (error) {
    console.error('Error reading or parsing CSV file:', error);
    process.exit(1);
  }
}

// Check if CSV file path is provided
if (process.argv.length < 3) {
  console.log('Usage: node import-qa-knowledge.js <path-to-csv-file>');
  console.log('Example: node import-qa-knowledge.js questions.csv');
  process.exit(1);
}

const csvPath = process.argv[2];

// Check if file exists
if (!fs.existsSync(csvPath)) {
  console.error(`Error: File not found: ${csvPath}`);
  process.exit(1);
}

// Run the import
importQAKnowledge(csvPath)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Import failed:', error);
    process.exit(1);
  });