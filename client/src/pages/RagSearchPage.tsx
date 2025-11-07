import React from 'react';
import { RagSearch } from '@/components/RagSearch';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, Zap, BookOpen, Shield, TrendingUp } from 'lucide-react';

export default function RagSearchPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Search",
      description: "Advanced semantic search that understands context and meaning"
    },
    {
      icon: Search,
      title: "Comprehensive Knowledge",
      description: "Search through thousands of Q&A entries about ADUs and elder care"
    },
    {
      icon: Zap,
      title: "Instant Answers",
      description: "Get detailed, context-aware answers in seconds"
    },
    {
      icon: BookOpen,
      title: "Source Attribution",
      description: "Every answer includes sources and confidence scores"
    },
    {
      icon: Shield,
      title: "Expert Knowledge",
      description: "Based on verified information from elder care professionals"
    },
    {
      icon: TrendingUp,
      title: "Always Learning",
      description: "Continuously updated with the latest information and best practices"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Elder Care Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get instant, accurate answers to your questions about ADUs, elder care,
              retirement planning, and more. Our AI searches through our comprehensive
              knowledge base to provide you with the most relevant information.
            </p>

            {!user && (
              <div className="flex justify-center space-x-4">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Start Searching
                </Button>
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Section */}
          <div className="lg:col-span-2">
            <RagSearch />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-blue-600" />
                  Key Features
                </CardTitle>
                <CardDescription>
                  What makes our AI assistant special
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <feature.icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        {feature.title}
                      </h4>
                      <p className="text-gray-600 text-xs">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                  Popular Topics
                </CardTitle>
                <CardDescription>
                  Common questions we can help with
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "ADU Design & Construction",
                    "Elder Care Planning",
                    "Retirement Finances",
                    "Accessibility Modifications",
                    "Government Benefits",
                    "Legal Considerations",
                    "Healthcare Options",
                    "Family Caregiving"
                  ].map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{topic}</span>
                      <Badge variant="secondary" className="text-xs">
                        Popular
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                  Knowledge Base Stats
                </CardTitle>
                <CardDescription>
                  Our comprehensive database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Q&A Entries</span>
                    <span className="font-semibold text-gray-900">16,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Topics Covered</span>
                    <span className="font-semibold text-gray-900">50+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expert Sources</span>
                    <span className="font-semibold text-gray-900">100+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Response Time</span>
                    <span className="font-semibold text-gray-900">&lt;2s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-orange-600" />
                  Need Help?
                </CardTitle>
                <CardDescription>
                  Get additional support
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Search className="h-4 w-4 mr-2" />
                  Browse All Topics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Expert Directory
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Ask any question about elder care, ADUs, retirement planning, or related topics.
              Our AI will search through our comprehensive knowledge base and provide you with
              detailed, accurate answers with source citations.
            </p>
            <div className="flex justify-center space-x-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Searching Now
              </Button>
              <Button size="lg" variant="outline">
                View Example Questions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
