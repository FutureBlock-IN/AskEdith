import { connectRedis } from './redis';
import { preloadCache } from './cache';

export async function initializeRedis(): Promise<void> {
  console.log('Initializing Redis...');
  
  try {
    // Connect to Redis
    await connectRedis();
    
    // Preload frequently accessed data into cache
    await preloadCache();
    
    console.log('Redis initialization completed successfully');
  } catch (error) {
    console.error('Redis initialization failed:', error);
    console.log('Continuing without Redis cache...');
    // Application continues to work without Redis
  }
}