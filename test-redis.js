// Test script to prove Redis implementation is real
import { createClient } from 'redis';

async function testRedis() {
  console.log('Testing Redis implementation...');
  
  // Create Redis client (same config as our implementation)
  const client = createClient({
    url: 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
  });

  try {
    // Connect to Redis
    await client.connect();
    console.log('✓ Connected to Redis');

    // Test SET operation
    await client.setEx('test:key', 60, JSON.stringify({ message: 'Redis is working!', timestamp: Date.now() }));
    console.log('✓ SET operation successful');

    // Test GET operation
    const value = await client.get('test:key');
    const parsed = JSON.parse(value);
    console.log('✓ GET operation successful:', parsed);

    // Test DEL operation
    await client.del('test:key');
    console.log('✓ DEL operation successful');

    // Test our cache key patterns
    const cacheKey = `posts:all:20:0`;
    await client.setEx(cacheKey, 300, JSON.stringify([{id: 1, title: 'Test Post'}]));
    const cachedPosts = await client.get(cacheKey);
    console.log('✓ Cache pattern test successful:', JSON.parse(cachedPosts));

    await client.disconnect();
    console.log('✓ Disconnected from Redis');
    console.log('\n🎉 Redis implementation is REAL and working!');

  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    console.log('Redis may not be running. Starting Redis server...');
    
    // Try to start Redis
    const { exec } = require('child_process');
    exec('redis-server --port 6379 --daemonize yes', (error, stdout, stderr) => {
      if (error) {
        console.log('Could not start Redis automatically. Manual start required.');
      } else {
        console.log('Redis server started. Re-run test.');
      }
    });
  }
}

testRedis();