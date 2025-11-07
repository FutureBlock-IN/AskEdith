import session from "express-session";
import { RedisStore } from "connect-redis";
import MemoryStore from "memorystore";
import { redisClient } from "./redis";

export function createRedisSessionStore() {
  const sessionTtl = 7 * 24 * 60 * 60; // 1 week in seconds
  
  let store;
  
  try {
    // Try Redis first
    store = new RedisStore({
      client: redisClient,
      prefix: "sess:",
      ttl: sessionTtl,
    });
    console.log('Using Redis for session storage');
  } catch (error) {
    // Fallback to memory store
    console.log('Redis unavailable, using memory store for sessions');
    const MemStore = MemoryStore(session);
    store = new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: store,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl * 1000, // Convert to milliseconds
      sameSite: 'lax'
    },
  });
}