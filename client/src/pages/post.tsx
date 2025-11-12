import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Heart, MessageCircle, Reply, Flag, Share2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { categoryIcons } from "@/lib/categories";

export default function Post() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: [`/api/posts/${id}`],
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: [`/api/posts/${id}/comments`],
    enabled: !!id,
  });

  const { data: userVote } = useQuery({
    queryKey: [`/api/vote/${id}`],
    enabled: !!id && isAuthenticated,
  });

  const voteMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vote", { postId: parseInt(id!) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vote/${id}`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest("POST", `/api/posts/${id}/comments`, { content }),
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      toast({
        title: "Comment posted!",
        description: "Your comment has been added to the discussion.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
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

  const IconComponent = categoryIcons[post.category.slug] || MessageCircle;
  const gradientClass = `gradient-${post.category.color}`;

  const handleVote = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on posts.",
      });
      return;
    }
    voteMutation.mutate();
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment on posts.",
      });
      return;
    }
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment);
  };

  const formatDate = (date: string) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link href={`/category/${post.category.slug}`}>
            <Badge variant="secondary" className="flex items-center gap-2">
              <div className={`w-3 h-3 ${gradientClass} rounded-full`}></div>
              {post.category.name}
            </Badge>
          </Link>
        </div>

        {/* Main Post */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.author.profileImageUrl} />
                  <AvatarFallback>
                    {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-gray-900">
                    {post.author.firstName} {post.author.lastName?.[0]}.
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatDate(post.createdAt)}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Flag className="w-4 h-4" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">{post.title}</h1>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-gray-700 mb-6">
              {post.content.split('\n').map((paragraph: string, index: number) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
            
            <Separator className="my-6" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVote}
                  className={`flex items-center gap-2 ${userVote?.voted ? 'text-red-600' : 'text-gray-600'}`}
                >
                  <Heart className={`w-4 h-4 ${userVote?.voted ? 'fill-current' : ''}`} />
                  {post.helpfulVotes} helpful
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {post.commentCount} replies
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const appUrl = (process.env.REACT_APP_APP_URL || window.location.origin).replace(/\/$/, "");
                    const shareUrl = `${appUrl}/post/${post.id}`;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      toast({ title: "Share link copied", description: "Link copied to clipboard." });
                    } else {
                      // Fallback: open native prompt so user can copy
                      // eslint-disable-next-line no-alert
                      window.prompt("Copy this link:", shareUrl);
                    }
                  } catch (err) {
                    console.error("Failed to copy share link:", err);
                    toast({ title: "Error", description: "Failed to copy share link.", variant: "destructive" });
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Copy share link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Responses ({comments?.length || 0})
          </h2>

          {/* Add Comment */}
          {isAuthenticated ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Share your thoughts or experiences..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Remember: Be supportive and respectful
                      </div>
                      <Button 
                        onClick={handleComment}
                        disabled={!newComment.trim() || commentMutation.isPending}
                      >
                        {commentMutation.isPending ? "Posting..." : "Reply to Post"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 mb-4">Sign in to join the conversation</p>
                <Button onClick={() => window.location.href = '/auth'}>
                  Sign In
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments?.map((comment: any) => (
              <Card key={comment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={comment.author.profileImageUrl} />
                      <AvatarFallback>
                        {comment.author.firstName?.[0]}{comment.author.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {comment.author.firstName} {comment.author.lastName?.[0]}.
                        </span>
                        {comment.isExpertResponse && (
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            Verified Expert
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="text-gray-700 mb-3">
                        {comment.content}
                      </div>
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="text-gray-500">
                          <Heart className="w-3 h-3 mr-1" />
                          {comment.helpfulVotes}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500">
                          <Reply className="w-3 h-3 mr-1" />
                          Reply to Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
