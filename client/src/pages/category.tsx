import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Plus, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import { categoryIcons } from "@/lib/categories";

export default function Category() {
  const { slug } = useParams();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { data: category } = useQuery({
    queryKey: [`/api/categories/${slug}`],
    enabled: !!slug,
  });

  const { data: posts } = useQuery({
    queryKey: [`/api/posts`, category?.id],
    queryFn: () => fetch(`/api/posts?categoryId=${category?.id}`).then(res => res.json()),
    enabled: !!category?.id,
  });

  const IconComponent = category ? categoryIcons[category.slug] : MessageCircle;

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Category not found</h1>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const gradientClass = `gradient-${category.color}`;
  const bgClass = `bg-${category.color}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Header */}
        <div className={`${bgClass} rounded-2xl p-8 mb-8`}>
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 ${gradientClass} rounded-2xl flex items-center justify-center`}>
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
              <p className="text-gray-700 text-lg mb-4">{category.description}</p>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>{category.postCount} discussions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Active community</span>
                </div>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
              onClick={() => setShowCreatePost(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Discussion
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Posts */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {posts?.length > 0 ? (
                posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No discussions yet</h3>
                    <p className="text-gray-500 mb-4">Be the first to start a conversation in this category!</p>
                    <Button onClick={() => setShowCreatePost(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Discussion
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Community Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Be respectful and supportive</li>
                  <li>• Share experiences, not medical advice</li>
                  <li>• Protect personal information</li>
                  <li>• Use clear, descriptive titles</li>
                  <li>• Search before posting duplicates</li>
                </ul>
              </CardContent>
            </Card>

            {/* Related Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Related Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* This would show related categories based on the current one */}
                  <p className="text-sm text-gray-500">
                    Explore related discussions and find more support.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Safety Reminder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Safe Space
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  This is a safe, moderated space. Personal contact information is automatically protected.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
