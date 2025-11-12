import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { X, AlertTriangle, LogIn } from "lucide-react";

interface NewPostModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'post' | 'topic';
}

export default function NewPostModal({ open, onClose, mode = 'post' }: NewPostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedForumId, setSelectedForumId] = useState("");
  const [selectedDiscussionId, setSelectedDiscussionId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Fetch forums (level 0 categories)
  const { data: forums = [] } = useQuery({
    queryKey: ["/api/categories/level/0"],
  });

  // Fetch category hierarchy for discussions and topics
  const { data: categoryHierarchy = [] } = useQuery({
    queryKey: ["/api/categories/hierarchy"],
  });

  // Get discussions for selected forum
  const getDiscussionsForForum = (forumId: string) => {
    if (!forumId || !Array.isArray(categoryHierarchy)) return [];
    const forum = categoryHierarchy.find((f: any) => f.id.toString() === forumId);
    return forum?.children || [];
  };

  // Get topics for selected discussion
  const getTopicsForDiscussion = (discussionId: string) => {
    if (!discussionId || !selectedForumId || !Array.isArray(categoryHierarchy)) return [];
    const forum = categoryHierarchy.find((f: any) => f.id.toString() === selectedForumId);
    const discussion = forum?.children?.find((d: any) => d.id.toString() === discussionId);
    return discussion?.children || [];
  };

  const discussions = getDiscussionsForForum(selectedForumId);
  const topics = getTopicsForDiscussion(selectedDiscussionId);

  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; categoryId: number }) => {
      return await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });

      if (data.moderationNote) {
        toast({
          title: "Post Created with Review Notice",
          description: data.moderationNote,
          variant: "default",
        });
      } else {
        toast({
          title: "Success!",
          description: "Your discussion has been posted successfully.",
        });
      }

      handleClose();
    },
    onError: (error: any) => {
      if (error.message?.includes("content policy")) {
        toast({
          title: "Post Cannot Be Published",
          description: "Your post contains content that violates our community guidelines. Please revise and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create post. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine target category: Topic > Discussion > Forum
    const targetCategoryId = selectedTopicId || selectedDiscussionId || selectedForumId;
    
    if (!title.trim() || !content.trim() || !selectedForumId) {
      toast({
        title: "Missing Information",
        description: "Please select a forum and fill in all fields before posting.",
        variant: "destructive",
      });
      return;
    }

    // If discussions are available but none selected, require discussion selection
    if (discussions.length > 0 && !selectedDiscussionId) {
      toast({
        title: "Missing Information",
        description: "Please select a discussion from the available options.",
        variant: "destructive",
      });
      return;
    }

    // Topic selection is always optional - user can post to Forum or Discussion level

    createPostMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      categoryId: parseInt(targetCategoryId),
    });
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setSelectedForumId("");
    setSelectedDiscussionId("");
    setSelectedTopicId("");
    setNewTopicName("");
    onClose();
  };

  // Reset child selections when parent changes
  const handleForumChange = (value: string) => {
    setSelectedForumId(value);
    setSelectedDiscussionId("");
    setSelectedTopicId("");
  };

  const handleDiscussionChange = (value: string) => {
    setSelectedDiscussionId(value);
    setSelectedTopicId("");
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Join the Conversation
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Sign in to share your experiences and connect with other caregivers.
            </DialogDescription>
          </DialogHeader>

          <div className="text-center py-8">
            <LogIn className="w-12 h-12 text-teal-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Share Your Story?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of caregivers who have found support and answers in our community.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                Sign In to Continue
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Browse as Guest
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-teal-50">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Start a New Discussion
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Share your caregiving experience and connect with others facing similar challenges.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cascading Selection: Forum → Discussion → Topic */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forum">Forum</Label>
              <Select value={selectedForumId} onValueChange={handleForumChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Forum" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(forums) && forums.map((forum: any) => (
                    <SelectItem key={forum.id} value={forum.id.toString()}>
                      {forum.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discussion">Discussion {discussions.length === 0 && selectedForumId && "(Optional - will post to Forum)"}</Label>
              {discussions.length > 0 ? (
                <Select value={selectedDiscussionId} onValueChange={handleDiscussionChange} disabled={!selectedForumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Discussion" />
                  </SelectTrigger>
                  <SelectContent>
                    {discussions.map((discussion: any) => (
                      <SelectItem key={discussion.id} value={discussion.id.toString()}>
                        {discussion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                  {selectedForumId ? 
                    "No specific discussions available. Your post will be added directly to the selected forum." : 
                    "Select a forum first to see available discussions."
                  }
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic (Optional)</Label>
              {mode === 'topic' ? (
                <Input
                  id="topic"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Enter Your Topic Name"
                  disabled={!selectedDiscussionId}
                />
              ) : topics.length > 0 ? (
                <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={!selectedDiscussionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Topic (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.id.toString()}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                  {selectedDiscussionId ? 
                    "No specific topics available. Your post will be added directly to the selected discussion." : 
                    "Select a discussion first to see available topics."
                  }
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Post Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to discuss?"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Your Question or Story</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience, ask for advice, or start a discussion..."
              rows={6}
              maxLength={2000}
            />
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Remember to protect personal information and avoid sharing specific medical details
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPostMutation.isPending}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {createPostMutation.isPending ? "Posting..." : "Post Discussion"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}