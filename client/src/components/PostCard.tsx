import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Heart, Clock, CheckCircle, ChevronDown, ChevronRight, Reply, Calendar, ExternalLink, Star, Share2 } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ExpertBadge from "./ExpertBadge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  helpfulVotes: number;
  isExpertResponse: boolean;
  author: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    role: string;
  };
  parentId?: number;
}

interface PostCardProps {
  post: {
    id: number;
    title: string;
    content: string;
    helpfulVotes: number;
    commentCount: number;
    isResolved: boolean;
    createdAt: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      profileImageUrl?: string;
      city?: string;
      state?: string;
      role?: string;
      approved?: string;
    };
    category: {
      id: number;
      name: string;
      slug: string;
      color: string;
    };
    expertVerification?: {
      id: number;
      userId: string;
      expertiseArea?: string;
      credentials?: string;
      professionalTitle?: string;
      company?: string;
      profileImageUrl?: string;
      bio?: string;
      yearsExperience?: number;
      verificationStatus: string;
      verifiedAt?: string;
      featuredExpert: boolean;
    };
    authorPostCount?: number; // Annual post count for badge calculation
  };
}

export default function PostCard({ post }: PostCardProps) {
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [showReplyToPostForm, setShowReplyToPostForm] = useState(false);
  const [showReplyToCommentForm, setShowReplyToCommentForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comments for this post
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: isCommentsExpanded,
  });

  // Fetch favorite status
  const { data: favoriteStatus } = useQuery<{ isFavorited: boolean }>({
    queryKey: [`/api/posts/${post.id}/is-favorited`],
    enabled: isAuthenticated,
  });

  // Fetch favorite count
  const { data: favoriteCountData } = useQuery<{ count: number }>({
    queryKey: [`/api/posts/${post.id}/favorite-count`],
  });

  // Update state when data changes
  useEffect(() => {
    if (favoriteStatus) {
      setIsFavorited(favoriteStatus.isFavorited);
    }
  }, [favoriteStatus]);

  useEffect(() => {
    if (favoriteCountData) {
      setFavoriteCount(favoriteCountData.count);
    }
  }, [favoriteCountData]);

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (commentData: { content: string; parentId?: number }) => {
      return await apiRequest("POST", `/api/posts/${post.id}/comments`, commentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setReplyText("");
      setShowReplyToPostForm(false);
      setShowReplyToCommentForm(false);
      setReplyToCommentId(null);
      toast({
        title: "Reply posted successfully",
        description: "Your reply has been added to the discussion",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post reply",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/posts/${post.id}/favorite`);
    },
    onSuccess: (data) => {
      setIsFavorited(data.isFavorited);
      setFavoriteCount(prev => data.isFavorited ? prev + 1 : prev - 1);
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/is-favorited`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/favorite-count`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update favorite",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return postDate.toLocaleDateString();
  };

  const getExpertLevel = (postCount: number): 'bronze' | 'silver' | 'gold' | null => {
    if (postCount >= 100) return 'gold';
    if (postCount >= 50) return 'silver';
    if (postCount >= 2) return 'bronze';
    return null;
  };

  // Determine expert status based on role, approval, and verification
  const getExpertStatus = () => {
    if (post.author.role !== 'expert') return null;
    
    if (post.author.approved === 'no') {
      return { type: 'waiting', label: 'Waiting for Approval', color: 'bg-orange-100 text-orange-700' };
    }
    
    if (post.author.approved === 'yes' && post.expertVerification?.verificationStatus === 'verified') {
      return { type: 'verified', label: 'Verified Expert', color: 'bg-green-100 text-green-700' };
    }
    
    if (post.author.approved === 'yes') {
      return { type: 'approved', label: 'Verified Expert', color: 'bg-blue-100 text-blue-700' };
    }
    
    return null;
  };

  const expertStatus = getExpertStatus();
  const isVerifiedExpert = expertStatus?.type === 'verified';
  const expertLevel = post.authorPostCount ? getExpertLevel(post.authorPostCount) : null;
  const profileImageUrl = post.expertVerification?.profileImageUrl || post.author.profileImageUrl;

  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge 
              className="text-xs text-gray-700" 
              style={{ backgroundColor: 'hsl(165 48% 52% / 0.15)' }}
            >
              {post.category.name}
            </Badge>
            {post.isResolved && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>
          <h4 className="font-medium text-gray-900 mb-2 hover:text-teal-600">
            {post.title}
          </h4>
          
          {/* Post Content */}
          {post.content && (
            <div className="mb-3 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          )}
          
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            {/* Expert Profile Section */}
            {expertStatus ? (
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={profileImageUrl} />
                  <AvatarFallback className="bg-teal-500 text-white text-xs">
                    {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center space-x-2">
                  <span>by</span>
                  <button 
                    className="font-medium text-teal-600 hover:text-teal-800 hover:underline transition-all duration-200 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/expert/${post.author.id}`;
                    }}
                  >
                    {post.author.firstName} {post.author.lastName}
                  </button>
                  
                  {/* Expert Status Badge */}
                  <Badge 
                    className={`text-xs ${expertStatus.color} ml-2`}
                    data-testid={`badge-expert-${expertStatus.type}`}
                  >
                    {expertStatus.type === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {expertStatus.type === 'waiting' && <Clock className="w-3 h-3 mr-1" />}
                    {expertStatus.type === 'approved' && <Star className="w-3 h-3 mr-1" />}
                    {expertStatus.label}
                  </Badge>

                  {expertLevel && isVerifiedExpert && (
                    <ExpertBadge 
                      level={expertLevel} 
                      postCount={post.authorPostCount || 0} 
                      className="ml-1"
                    />
                  )}
                  
                  {isVerifiedExpert && (
                    <span
                      className="text-xs text-teal-600 hover:text-teal-700 underline cursor-pointer flex items-center gap-1 transition-colors ml-2"
                      style={{ textDecorationColor: '#0d9488' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/book/${post.author.id}`;
                      }}
                    >
                      Book Appointment
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={post.author.profileImageUrl} />
                  <AvatarFallback className="bg-gray-500 text-white text-xs">
                    {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>
                  by{" "}
                  <button
                    className="font-medium hover:underline transition-all duration-200 cursor-pointer"
                    style={{ color: 'hsl(var(--coral-primary))' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/profile/${post.author.id}`;
                    }}
                  >
                    {post.author.firstName} {post.author.lastName}
                  </button>
                </span>
              </div>
            )}
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatDate(post.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {/* Accordion arrow for comments */}
          {post.commentCount > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCommentsExpanded(!isCommentsExpanded);
              }}
              className="flex items-center hover:text-gray-700 transition-colors"
            >
              {isCommentsExpanded ? (
                <ChevronDown className="w-6 h-6 font-bold stroke-2" />
              ) : (
                <ChevronRight className="w-6 h-6 font-bold stroke-2" />
              )}
            </button>
          )}
          <span className="flex items-center">
            <MessageSquare 
              className={`w-4 h-4 mr-1 transition-colors ${
                post.commentCount > 0 ? 'fill-current text-[#0B666B]' : ''
              }`} 
            />
            {post.commentCount}
          </span>
          {/* SharePostLinkCode */}
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");
                const shareUrl = `${appUrl}/post/${post.id}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(shareUrl);
                  toast({ title: "Link copied!", description: "" });
                } else {
                  // Fallback for insecure contexts
                  // eslint-disable-next-line no-alert
                  window.prompt("Copy this link:", shareUrl);
                  toast({ title: "Link copied!", description: "" });
                }
              } catch (err) {
                console.error("Failed to copy share link:", err);
                toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
              }
            }}
            className="flex items-center hover:text-gray-700 transition-colors"
            title="Copy post link"
          >
            <Share2 className="w-4 h-4 mr-1" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isAuthenticated) {
                toast({
                  title: "Sign in required",
                  description: "Please sign up or sign in to continue",
                });
                return;
              }
              toggleFavoriteMutation.mutate();
            }}
            className="flex items-center hover:text-gray-700 transition-colors"
            disabled={toggleFavoriteMutation.isPending}
          >
            <Heart 
              className={`w-4 h-4 mr-1 transition-colors ${isFavorited ? 'fill-current text-red-500' : ''}`} 
              style={{ color: isFavorited ? undefined : 'hsl(var(--coral-primary))' }} 
            />
            {favoriteCount}
          </button>
        </div>
      </div>
      
      {/* Reply to Post Button */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isAuthenticated) {
              toast({
                title: "Sign in required",
                description: "Please sign up or sign in to continue",
              });
              return;
            }
            setShowReplyToPostForm(!showReplyToPostForm);
          }}
          className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-bold transition-all duration-200 hover:scale-105"
        >
          <Reply className="w-4 h-4" />
          <span>Reply to Post</span>
        </button>
      </div>
      
      {/* Reply to Post Form */}
      {showReplyToPostForm && (
        <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-gray-400 text-white text-xs">
                YU
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Share your thoughts on this post..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">
                  Be respectful and helpful to fellow caregivers
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowReplyToPostForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast({
                          title: "Please log in",
                          description: "You need to be logged in to post a reply",
                          variant: "destructive",
                        });
                        return;
                      }
                      createCommentMutation.mutate({ content: replyText });
                    }}
                    disabled={!replyText.trim() || createCommentMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {createCommentMutation.isPending ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded Comments */}
      {isCommentsExpanded && (
        <div className="mt-4 border-l-4 pl-4" style={{ borderColor: 'hsl(var(--coral-primary) / 0.4)' }}>
          {comments.length === 0 ? (
            <div className="text-sm text-gray-500 italic">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            comments.map((comment: Comment) => (
              <div key={comment.id} className="mb-4 pb-4 border-b" style={{ borderColor: 'hsl(var(--coral-primary) / 0.3)' }}>
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {comment.author.profileImageUrl ? (
                      <AvatarImage src={comment.author.profileImageUrl} />
                    ) : (
                      <AvatarFallback className="bg-blue-400 text-white text-xs">
                        {comment.author.firstName?.[0]}{comment.author.lastName?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:underline transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = comment.author.role === 'expert' ? `/expert/${comment.author.id}` : `/profile/${comment.author.id}`;
                        }}
                      >
                        {comment.author.firstName} {comment.author.lastName}
                      </button>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                        <Heart className="w-3 h-3" style={{ color: 'hsl(var(--coral-primary))' }} />
                        <span>{comment.helpfulVotes || 0}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isAuthenticated) {
                            toast({
                              title: "Sign in required",
                              description: "Please sign up or sign in to continue",
                            });
                            return;
                          }
                          setReplyToCommentId(comment.id);
                          setShowReplyToCommentForm(!showReplyToCommentForm || replyToCommentId !== comment.id);
                        }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Reply className="w-3 h-3" />
                        Reply to Comment
                      </button>
                    </div>
                    
                    {/* Reply to Comment Form */}
                    {showReplyToCommentForm && replyToCommentId === comment.id && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback className="bg-gray-400 text-white text-xs">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Reply to this comment..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-[60px] resize-none text-sm"
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setShowReplyToCommentForm(false);
                                  setReplyToCommentId(null);
                                  setReplyText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    toast({
                                      title: "Please log in",
                                      description: "You need to be logged in to post a reply",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  createCommentMutation.mutate({ 
                                    content: replyText, 
                                    parentId: comment.id 
                                  });
                                }}
                                disabled={!replyText.trim() || createCommentMutation.isPending}
                                className="bg-teal-600 hover:bg-teal-700"
                              >
                                {createCommentMutation.isPending ? "Posting..." : "Reply"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}