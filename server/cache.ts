import RedisCache from './redis';

// Cache key generators
export const CacheKeys = {
  posts: (categoryId?: number, limit?: number, offset?: number) => 
    `posts:${categoryId || 'all'}:${limit || 20}:${offset || 0}`,
  post: (id: number) => `post:${id}`,
  postComments: (postId: number) => `post:${postId}:comments`,
  categories: () => 'categories:all',
  categoriesLevel: (level: number) => `categories:level:${level}`,
  categoryHierarchy: () => 'categories:hierarchy',
  categoryBySlug: (slug: string) => `category:slug:${slug}`,
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  userByUsername: (username: string) => `user:username:${username}`,
  expertVerification: (userId: string) => `expert:${userId}`,
  verifiedExperts: () => 'experts:verified',
  featuredExperts: () => 'experts:featured',
  communityStats: () => 'stats:community',
  achievements: () => 'achievements:all',
  userAchievements: (userId: string) => `user:${userId}:achievements`,
  searchPhrases: 'search:phrases',
};

// Cache TTL settings (in seconds)
export const CacheTTL = {
  posts: 300, // 5 minutes
  post: 600, // 10 minutes  
  comments: 180, // 3 minutes
  categories: 3600, // 1 hour
  user: 1800, // 30 minutes
  experts: 7200, // 2 hours
  stats: 900, // 15 minutes
  achievements: 3600, // 1 hour
  long: 7200, // 2 hours
};

// Cache invalidation patterns
export const InvalidationPatterns = {
  posts: 'posts:*',
  post: (id: number) => [`post:${id}`, `post:${id}:*`],
  categories: 'categories:*',
  user: (id: string) => [`user:${id}`, `user:${id}:*`],
  experts: 'experts:*',
  stats: 'stats:*',
};

// Generic caching wrapper function
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFunction: () => Promise<T>
): Promise<T> {
  const cache = RedisCache;
  
  // Try to get from cache first
  const cached = await cache.get(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }
  
  console.log(`Cache MISS: ${key}`);
  
  // Fetch fresh data
  const data = await fetchFunction();
  
  // Store in cache
  await cache.set(key, data, ttl);
  
  return data;
}

// Cache invalidation helpers
export async function invalidateCache(patterns: string | string[]): Promise<void> {
  const cache = RedisCache;
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
  
  for (const pattern of patternsArray) {
    await cache.delPattern(pattern);
    console.log(`Cache invalidated: ${pattern}`);
  }
}

// Preload cache for frequently accessed data
export async function preloadCache(): Promise<void> {
  console.log('Preloading cache with frequently accessed data...');
  
  try {
    // Import storage here to avoid circular dependencies
    const { storage } = await import('./storage');
    
    // Preload categories
    await withCache(
      CacheKeys.categories(),
      CacheTTL.categories,
      () => storage.getCategories()
    );
    
    // Preload category hierarchy
    await withCache(
      CacheKeys.categoryHierarchy(),
      CacheTTL.categories,
      () => storage.getCategoryHierarchy()
    );
    
    // Preload level 0 categories (forums)
    await withCache(
      CacheKeys.categoriesLevel(0),
      CacheTTL.categories,
      () => storage.getCategoriesByLevel(0)
    );
    
    // Preload community stats
    await withCache(
      CacheKeys.communityStats(),
      CacheTTL.stats,
      () => storage.getCommunityStats()
    );
    
    // Preload recent posts
    await withCache(
      CacheKeys.posts(),
      CacheTTL.posts,
      () => storage.getPosts()
    );
    
    console.log('Cache preloading completed');
  } catch (error) {
    console.error('Cache preloading failed:', error);
  }
}