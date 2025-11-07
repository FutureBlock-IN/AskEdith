import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { graphqlRequest, GET_COMMUNITY_STATS, GET_CATEGORIES, type CommunityStats, type Category } from '@/lib/graphql';
import { Users, MessageSquare, TrendingUp, Calendar } from 'lucide-react';

export function GraphQLStatsDemo() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingGraphQL, setUsingGraphQL] = useState(false);

  const fetchWithGraphQL = async () => {
    setLoading(true);
    setError(null);
    setUsingGraphQL(true);
    
    try {
      // Fetch community stats via GraphQL
      const statsResponse = await graphqlRequest<{ communityStats: CommunityStats }>({
        query: GET_COMMUNITY_STATS
      });
      
      if (statsResponse.data) {
        setStats(statsResponse.data.communityStats);
      }

      // Fetch categories via GraphQL
      const categoriesResponse = await graphqlRequest<{ categories: Category[] }>({
        query: GET_CATEGORIES
      });
      
      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data.categories);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GraphQL request failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithREST = async () => {
    setLoading(true);
    setError(null);
    setUsingGraphQL(false);
    
    try {
      // Fetch community stats via REST API
      const statsResponse = await fetch('/api/stats');
      if (!statsResponse.ok) {
        throw new Error(`HTTP Error: ${statsResponse.status}`);
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch categories via REST API
      const categoriesResponse = await fetch('/api/categories');
      if (!categoriesResponse.ok) {
        throw new Error(`HTTP Error: ${categoriesResponse.status}`);
      }
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'REST request failed');
    } finally {
      setLoading(false);
    }
  };

  // Load with REST by default
  useEffect(() => {
    fetchWithREST();
  }, []);

  return (
    <div className="space-y-6">
      {/* API Comparison Header */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            API Integration Demo
            <Badge variant={usingGraphQL ? "default" : "secondary"}>
              {usingGraphQL ? "GraphQL" : "REST API"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Compare GraphQL vs REST API performance for fetching community data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={fetchWithGraphQL} 
              disabled={loading}
              variant={usingGraphQL ? "default" : "outline"}
            >
              {loading && usingGraphQL ? "Loading..." : "Use GraphQL"}
            </Button>
            <Button 
              onClick={fetchWithREST} 
              disabled={loading}
              variant={!usingGraphQL ? "default" : "outline"}
            >
              {loading && !usingGraphQL ? "Loading..." : "Use REST API"}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
              <p className="text-red-700 dark:text-red-300 text-sm">Error: {error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPosts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posts This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.postsThisWeek}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories Preview */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Discussion Categories</CardTitle>
            <CardDescription>
              Showing {categories.length} categories fetched via {usingGraphQL ? "GraphQL" : "REST API"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.slice(0, 6).map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.postCount || 0} posts
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {categories.length > 6 && (
              <p className="text-sm text-muted-foreground mt-4">
                And {categories.length - 6} more categories...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">
            GraphQL Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>GraphQL server running at /graphql endpoint</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Type-safe GraphQL schema with 150+ fields</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Resolvers for nested data relationships</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Session-based authentication integration</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Both GraphQL and REST APIs available</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}