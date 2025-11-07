import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface SearchLog {
  id: number;
  query: string;
  answer: string;
  userId: string | null;
  source: string;
  resultFound: boolean;
  createdAt: string;
}

export default function AdminSearchLogs() {
  const [limit, setLimit] = useState(100);

  const { data: searchLogs = [], isLoading } = useQuery<SearchLog[]>({
    queryKey: ['/api/admin/search-logs', limit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/search-logs?limit=${limit}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch search logs');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Calculate stats
  const totalSearches = searchLogs.length;
  const successfulSearches = searchLogs.filter(log => log.resultFound).length;
  const successRate = totalSearches > 0 ? (successfulSearches / totalSearches * 100).toFixed(1) : 0;
  
  // Find most common queries
  const queryFrequency = searchLogs.reduce((acc, log) => {
    const query = log.query.toLowerCase();
    acc[query] = (acc[query] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topQueries = Object.entries(queryFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([query, count]) => ({ query, count }));

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Search Analytics</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSearches}</div>
            <p className="text-xs text-muted-foreground">Last {limit} searches</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {Number(successRate) > 50 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">Found answers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topQueries.slice(0, 3).map((item, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{item.query}</span>
                  <span className="text-muted-foreground ml-2">({item.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Search Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Query</TableHead>
                  <TableHead className="w-[400px]">Answer</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.query}</TableCell>
                    <TableCell>
                      <div className="max-w-[400px] truncate" title={log.answer}>
                        {log.answer}
                      </div>
                    </TableCell>
                    <TableCell>{log.source}</TableCell>
                    <TableCell>
                      <Badge variant={log.resultFound ? "default" : "secondary"}>
                        {log.resultFound ? "Found" : "Not Found"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.userId || "Anonymous"}</TableCell>
                    <TableCell>
                      {format(new Date(log.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Load More */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setLimit(limit + 100)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Load More
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}