import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoteButtonProps {
  contentId: number;
  contentType: 'post' | 'comment';
  initialVotes: number;
  initialUserVote?: 'up' | 'down' | null;
  userId?: string; // If user is logged in
  compact?: boolean;
}

export function VoteButton({ 
  contentId, 
  contentType, 
  initialVotes, 
  initialUserVote = null,
  userId,
  compact = false 
}: VoteButtonProps) {
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user vote if authenticated
  const { data: currentUserVote } = useQuery<{ voteType: 'up' | 'down' | null }>({
    queryKey: [`/api/${contentType}s/${contentId}/vote`],
    enabled: !!userId,
    retry: false,
  });

  // Handle vote data when it changes
  React.useEffect(() => {
    if (currentUserVote?.voteType) {
      setUserVote(currentUserVote.voteType);
    }
  }, [currentUserVote]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: 'up' | 'down') => {
      const response = await fetch(`/api/${contentType}s/${contentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote');
      }

      return response.json();
    },
    onMutate: async (voteType) => {
      // Optimistic update
      const oldVote = userVote;
      const oldVotes = votes;
      
      let newVotes = oldVotes;
      let newUserVote: 'up' | 'down' | null = voteType;

      if (oldVote === voteType) {
        // Removing vote (toggle off)
        newUserVote = null;
        newVotes = oldVotes + (voteType === 'up' ? -1 : 1);
      } else if (oldVote && oldVote !== voteType) {
        // Changing vote
        newVotes = oldVotes + (voteType === 'up' ? 2 : -2);
      } else {
        // Adding new vote
        newVotes = oldVotes + (voteType === 'up' ? 1 : -1);
      }

      setUserVote(newUserVote);
      setVotes(Math.max(0, newVotes));

      return { oldVote, oldVotes };
    },
    onError: (error: any, voteType, context) => {
      // Revert optimistic update on error
      if (context) {
        setUserVote(context.oldVote);
        setVotes(context.oldVotes);
      }
      
      if (error.message?.includes('Unauthorized') || error.message?.includes('authentication')) {
        toast({
          title: "Login Required",
          description: "Please sign in to vote on content.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Vote Failed",
          description: error.message || "Failed to record your vote. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSuccess: (data) => {
      // Update with server response
      if (data) {
        setVotes(data.helpfulVotes || votes);
      }
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/${contentType}s`] });
      queryClient.invalidateQueries({ queryKey: [`/api/${contentType}s/${contentId}`] });
      
      // Show success feedback for first vote
      if (!initialUserVote && userVote) {
        toast({
          title: "Vote Recorded",
          description: `Your ${userVote === 'up' ? 'upvote' : 'downvote'} has been recorded.`,
          duration: 2000,
        });
      }
    },
  });

  const handleVote = (voteType: 'up' | 'down') => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please sign in to vote on content.",
        variant: "destructive",
      });
      return;
    }
    
    voteMutation.mutate(voteType);
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('up')}
          className={`h-6 w-6 p-0 ${userVote === 'up' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}`}
          disabled={voteMutation.isPending || !userId}
        >
          {voteMutation.isPending && voteMutation.variables === 'up' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ArrowUp className="w-3 h-3" />
          )}
        </Button>
        <span className="text-xs font-medium text-gray-600 min-w-[20px] text-center">
          {votes}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('down')}
          className={`h-6 w-6 p-0 ${userVote === 'down' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}`}
          disabled={voteMutation.isPending || !userId}
        >
          {voteMutation.isPending && voteMutation.variables === 'down' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-1 bg-gray-50 rounded-lg p-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        className={`h-8 w-8 p-0 rounded-md transition-colors ${
          userVote === 'up' 
            ? 'text-green-600 bg-green-100 hover:bg-green-200' 
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
        }`}
        disabled={voteMutation.isPending || !userId}
        title={!userId ? "Login to vote" : userVote === 'up' ? "Remove upvote" : "Upvote"}
      >
        {voteMutation.isPending && voteMutation.variables === 'up' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
      </Button>
      
      <span className="text-sm font-semibold text-gray-700 min-w-[24px] text-center">
        {votes}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        className={`h-8 w-8 p-0 rounded-md transition-colors ${
          userVote === 'down' 
            ? 'text-red-600 bg-red-100 hover:bg-red-200' 
            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
        }`}
        disabled={voteMutation.isPending || !userId}
        title={!userId ? "Login to vote" : userVote === 'down' ? "Remove downvote" : "Downvote"}
      >
        {voteMutation.isPending && voteMutation.variables === 'down' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )}
      </Button>
      
      {!userId && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Login to vote
        </p>
      )}
    </div>
  );
}

// Example usage in a post component
export function PostWithVoting({ post, user }: { post: any; user: any }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex gap-4">
        {/* Vote component */}
        <VoteButton
          contentId={post.id}
          contentType="post"
          initialVotes={post.helpfulVotes || 0}
          initialUserVote={post.userVote}
          userId={user?.id}
        />
        
        {/* Post content */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
          <p className="text-gray-700 mb-4">{post.content}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>by {post.author?.communityName || post.author?.username}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span>{post.commentCount || 0} comments</span>
            </div>
            
            {/* Compact vote display for inline use */}
            <VoteButton
              contentId={post.id}
              contentType="post"
              initialVotes={post.helpfulVotes || 0}
              initialUserVote={post.userVote}
              userId={user?.id}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}