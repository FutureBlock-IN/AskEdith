import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Database, Zap, RefreshCw, Play, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RagStats {
  totalChunks: number;
  totalQAs: number;
  averageChunksPerQA: number;
}

export default function RagAdmin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<RagStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertDescription>
            You need admin privileges to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/rag/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch RAG system statistics' });
    }
  };

  const initializeRagSystem = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rag/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'RAG system initialized successfully!' });
        await fetchStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize RAG system');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to initialize RAG system'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRagSystem = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rag/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'RAG system test completed successfully!' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to test RAG system');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to test RAG system'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Brain className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">RAG System Administration</h1>
        </div>
        <p className="text-gray-600">
          Manage and monitor the AI-powered search system for elder care knowledge base.
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* System Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              System Statistics
            </CardTitle>
            <CardDescription>
              Current state of the RAG system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Chunks</span>
                  <Badge variant="secondary">{stats.totalChunks.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Q&As</span>
                  <Badge variant="secondary">{stats.totalQAs.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Chunks/QA</span>
                  <Badge variant="secondary">{stats.averageChunksPerQA.toFixed(1)}</Badge>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading statistics...</div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-green-600" />
              System Status
            </CardTitle>
            <CardDescription>
              Current operational status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Vector Store</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Active
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Embeddings</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Ready
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Search Index</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Indexed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-purple-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Manage the RAG system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={initializeRagSystem}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Initialize System
            </Button>
            <Button
              onClick={testRagSystem}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Test System
            </Button>
            <Button
              onClick={fetchStats}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              System Configuration
            </CardTitle>
            <CardDescription>
              Current RAG system settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Embedding Model</span>
                <span className="text-sm font-medium">text-embedding-3-small</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Vector Dimension</span>
                <span className="text-sm font-medium">1536</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chunk Size</span>
                <span className="text-sm font-medium">512 tokens</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chunk Overlap</span>
                <span className="text-sm font-medium">50 tokens</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Search Results</span>
                <span className="text-sm font-medium">Top 5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Similarity Threshold</span>
                <span className="text-sm font-medium">0.7</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Data sources and coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Sources</span>
                <span className="text-sm font-medium">2 CSV files</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Primary Topics</span>
                <span className="text-sm font-medium">ADUs, Elder Care</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Content Type</span>
                <span className="text-sm font-medium">Q&A Format</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium">Today</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Processing Status</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Complete
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
          <CardDescription>
            How to use the RAG system administration panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Initialize System</h4>
              <p className="text-sm text-gray-600">
                Use this to set up the RAG system for the first time or reinitialize after changes.
                This will process all CSV data and create embeddings.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Test System</h4>
              <p className="text-sm text-gray-600">
                Run a test query to verify the system is working correctly and generating appropriate responses.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Monitor Stats</h4>
              <p className="text-sm text-gray-600">
                Keep track of system performance, data processing status, and usage metrics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
