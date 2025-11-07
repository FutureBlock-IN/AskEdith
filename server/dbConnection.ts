import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon WebSocket
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let dbInstance: ReturnType<typeof drizzle> | null = null;
let poolInstance: Pool | null = null;

async function initializeDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Create pool with connection retry settings
    poolInstance = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 3,
    });

    // Handle pool connection errors gracefully
    poolInstance.on('error', (err) => {
      console.warn('Database pool error:', err.message);
    });

    // Test the connection
    const client = await poolInstance.connect();
    await client.query('SELECT 1');
    client.release();

    dbInstance = drizzle({ client: poolInstance, schema });
    console.log('Database connection established successfully');
    return dbInstance;
  } catch (error: any) {
    console.error('Failed to initialize database:', error?.message || String(error));
    throw error;
  }
}

export async function getDatabase() {
  if (!dbInstance) {
    return await initializeDatabase();
  }
  return dbInstance;
}

export function getDatabaseSync() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call getDatabase() first.');
  }
  return dbInstance;
}

// Initialize database connection on module load
let initPromise: Promise<any> | null = null;

export function ensureDatabaseConnection() {
  if (!initPromise) {
    initPromise = initializeDatabase().catch(error => {
      console.error('Database initialization failed:', error);
      initPromise = null; // Reset so it can retry
      throw error;
    });
  }
  return initPromise;
}