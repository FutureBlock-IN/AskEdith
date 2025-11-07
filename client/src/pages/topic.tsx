import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Clock,
  User,
  Search,
  Plus,
  Filter,
  TrendingUp,
  Calendar,
  Star,
  CheckCircle,
  Shield,
  X,
} from "lucide-react";
import DynamicDiscussionTopicsSidebar from "@/components/DynamicDiscussionTopicsSidebar";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FakePost {
  id: number;
  title: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    isExpert?: boolean;
    location?: string;
  };
  upvotes: number;
  downvotes: number;
  commentCount: number;
  timeAgo: string;
  category: string;
  tags: string[];
  isResolved?: boolean;
  hasUserVoted?: 'up' | 'down' | null;
}



export default function TopicPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  
  // Modal states
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  
  // Form states for new post
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  
  // Form states for new topic
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicFirstPostTitle, setNewTopicFirstPostTitle] = useState('');
  const [newTopicFirstPostContent, setNewTopicFirstPostContent] = useState('');
  const [selectedDiscussionForum, setSelectedDiscussionForum] = useState('');
  const [selectedMainTopic, setSelectedMainTopic] = useState('');

  // Extract topic from URL (would be dynamic in real app)
  const topicName = new URLSearchParams(location.split('?')[1] || '').get('topic') || 'Home Care';

  // Fetch real posts from API
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['/api/posts'],
    retry: false,
  });

  // Fetch categories to get the current topic's categoryId
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    retry: false,
  });

  // Fetch category hierarchy for topic creation
  const { data: categoryHierarchy = [] } = useQuery({
    queryKey: ['/api/categories/hierarchy'],
    retry: false,
  });

  // Fetch discussion forums (level 0)
  const { data: discussionForums = [] } = useQuery({
    queryKey: ['/api/categories/level/0'],
    retry: false,
  });

  // Fetch main topics for selected discussion forum
  const { data: mainTopics = [], isLoading: mainTopicsLoading } = useQuery({
    queryKey: ['/api/categories/parent', selectedDiscussionForum],
    enabled: !!selectedDiscussionForum,
    retry: false,
  });





  // Topic hierarchy mapping function
  const findCategoryForTopic = (topicName: string, categories: any[]) => {
    // Direct match first
    let category = categories.find((cat: any) => 
      cat.name === topicName || cat.slug === topicName.toLowerCase().replace(/\s+/g, '-')
    );
    
    if (category) return category;
    
    // Define topic hierarchy mapping
    const topicHierarchy: { [key: string]: string } = {
      // Federal & State Resources subtopics
      "Area Agencies on Aging": "Federal & State Resources",
      "Long-Term Care Ombudsman": "Federal & State Resources", 
      "Adult Protective Services": "Federal & State Resources",
      "Adult Day Centers": "Federal & State Resources",
      "Meals on Wheels": "Federal & State Resources",
      "Transportation": "Federal & State Resources",
      "Friendship Line": "Federal & State Resources",
      "Suicide Prevention Hotline": "Federal & State Resources",
      "Tax Filing Help": "Federal & State Resources",
      
      // Veteran Benefits subtopics
      "VA Healthcare": "Veteran Benefits",
      "Disability Benefits": "Veteran Benefits",
      "Military Discounts": "Veteran Benefits",
      "Veteran Services": "Veteran Benefits",
      "GI Bill Benefits": "Veteran Benefits",
      
      // Medicare subtopics
      "Medicare Part A & B": "Medicare",
      "Medicare Part C": "Medicare",
      "Medicare Part D": "Medicare",
      
      // Medicaid subtopics
      "Qualifying for Medicaid": "Medicaid",
      "Lookback Periods": "Medicaid",
      "State Claims": "Medicaid",
      "Filing Assistance": "Medicaid",
      
      // Home Care subtopics
      "Recommended Agencies": "Home Care",
      "Managing Home Care Aides": "Home Care",
      "Negotiating with Home Care Agencies": "Home Care",
      "Typical Contract Periods": "Home Care",
      
      // ADUs & Home Modifications subtopics
      "Accessibility Modifications": "ADUs & Home Modifications",
      "Safety Features": "ADUs & Home Modifications",
      "ADU Construction": "ADUs & Home Modifications", 
      "Home Assessments": "ADUs & Home Modifications",
      
      // Selling a Home subtopics
      "Market Preparation": "Selling a Home",
      "Senior-Friendly Realtors": "Selling a Home",
      "Moving Assistance": "Selling a Home",
      "Estate Sales": "Selling a Home",
      
      // Senior Living subtopics
      "Senior Apartments": "Senior Living",
      "Active Adult": "Senior Living",
      "Independent Living": "Senior Living",
      "Assisted Living": "Senior Living",
      "Memory Care": "Senior Living",
      "Life Plan Communities": "Senior Living",
      "CCRCs": "Senior Living",
      
      // Respite Care subtopics
      "Adult Day Programs": "Respite Care",
      "Overnight Respite": "Respite Care",
      "Family Relief": "Respite Care",
      "Caregiver Support": "Respite Care",
      
      // Hospice subtopics
      "End-of-Life Planning": "Hospice",
      "Comfort Care": "Hospice",
      "Family Support": "Hospice",
      "Grief Resources": "Hospice"
    };
    
    // Check if current topic is a subtopic
    const parentTopic = topicHierarchy[topicName];
    if (parentTopic) {
      category = categories.find((cat: any) => cat.name === parentTopic);
    }
    
    return category;
  };
  
  const currentCategory = findCategoryForTopic(topicName, categories);
  const defaultCategoryId = currentCategory?.id || categories[0]?.id || 1;

  // Vote handler function for posts
  const handleVote = async (postId: number, voteType: 'up' | 'down') => {
    if (!user) return;
    // In real app, this would call the API
    console.log(`Vote ${voteType} on post ${postId}`);
  };

  // Mutation for creating new post
  const createPostMutation = useMutation({
    mutationFn: async (postData: { title: string; content: string; categoryId?: number }) => {
      const response = await apiRequest('POST', '/api/posts', postData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setShowNewPostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      toast({
        title: "Success",
        description: "Your post has been created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new topic (category)
  const createTopicMutation = useMutation({
    mutationFn: async (topicData: { 
      name: string; 
      description: string; 
      slug: string; 
      parentId?: number;
      level: number;
    }) => {
      const response = await apiRequest('POST', '/api/categories', topicData);
      return response.json();
    },
    onSuccess: async (newCategory) => {
      // Create the first post in the new topic
      const postData = {
        title: newTopicFirstPostTitle,
        content: newTopicFirstPostContent,
        categoryId: newCategory.id,
      };
      
      try {
        await apiRequest('POST', '/api/posts', postData);
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        queryClient.invalidateQueries({ queryKey: ['/api/categories/hierarchy'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        
        setShowNewTopicModal(false);
        setNewTopicTitle('');
        setNewTopicFirstPostTitle('');
        setNewTopicFirstPostContent('');
        setSelectedDiscussionForum('');
        setSelectedMainTopic('');
        
        toast({
          title: "Success",
          description: "Your new topic has been created successfully!",
        });
      } catch (error) {
        toast({
          title: "Warning",
          description: "Topic created but failed to create first post",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create topic",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const handleNewPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createPostMutation.mutate({
      title: newPostTitle,
      content: newPostContent,
      categoryId: defaultCategoryId,
    });
  };

  const handleNewTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicFirstPostTitle.trim() || !newTopicFirstPostContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate hierarchy selection for sub-topic
    if (!selectedDiscussionForum || !selectedMainTopic) {
      toast({
        title: "Error",
        description: "Please select both Discussion Forum and Main Topic for your Sub-Topic",
        variant: "destructive",
      });
      return;
    }
    
    const slug = newTopicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Always creating sub-topics (level 2) with main topic as parent
    const parentId = parseInt(selectedMainTopic);
    const level = 2;

    createTopicMutation.mutate({
      name: newTopicTitle,
      description: `Discussion about ${newTopicTitle}`,
      slug: slug,
      parentId,
      level,
    });
  };

  // Convert data to match PostCard format
  const convertedPosts = [
    {
      id: 1,
      title: "How do I find a reliable home care agency? Mom needs help 4 hours a day",
      content: "My 82-year-old mother recently had a fall and needs assistance with daily activities. I'm looking for a home care agency that can provide 4 hours of care daily. What should I look for when vetting agencies? Any red flags to watch out for?",
      helpfulVotes: 23,
      commentCount: 8,
      isResolved: false,
      createdAt: "2024-06-04T14:00:00Z",
      author: {
        id: "1",
        firstName: "Jennifer",
        lastName: "M.",
        profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format",
        city: "Phoenix",
        state: "AZ"
      },
      category: {
        id: 1,
        name: "Home Care",
        slug: "home-care",
        color: "#487d7a"
      }
    },
    {
      id: 2,
      title: "Home care aide doesn't follow care plan - how to address this professionally?",
      content: "We've been working with a home care aide for 3 weeks now. She's very sweet, but consistently doesn't follow the care plan we established. For example, she's not helping Dad with his physical therapy exercises and often lets him skip meals. How can I address this without being confrontational?",
      helpfulVotes: 45,
      commentCount: 12,
      isResolved: true,
      createdAt: "2024-06-04T10:00:00Z",
      author: {
        id: "2",
        firstName: "Dr. Sarah",
        lastName: "K.",
        profileImageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face&auto=format",
        city: "Denver",
        state: "CO"
      },
      category: {
        id: 1,
        name: "Home Care",
        slug: "home-care",
        color: "#487d7a"
      },
      expertVerification: {
        isVerified: true,
        expertise: "Geriatric Care"
      }
    },
    {
      id: 3,
      title: "Contract question: Agency wants 40-hour minimum, we only need 20 hours",
      content: "I'm negotiating with a home care agency and they're insisting on a 40-hour per week minimum. We realistically only need about 20 hours of care. Has anyone successfully negotiated lower minimums? Are there agencies that work with smaller hour requirements?",
      helpfulVotes: 18,
      commentCount: 6,
      isResolved: false,
      createdAt: "2024-06-04T08:00:00Z",
      author: {
        id: "3",
        firstName: "Michael",
        lastName: "R.",
        profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format",
        city: "Seattle",
        state: "WA"
      },
      category: {
        id: 1,
        name: "Home Care",
        slug: "home-care",
        color: "#487d7a"
      }
    },
    {
      id: 4,
      title: "What's a reasonable hourly rate for home care in suburban areas?",
      content: "We're getting quotes from different agencies and the rates vary wildly - from $18/hour to $35/hour. This is for basic companion care and light housekeeping. What should we expect to pay in a suburban setting? Are the higher-priced agencies necessarily better?",
      author: {
        firstName: "Linda",
        lastName: "T.",
        profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format",
        location: "Austin, TX"
      },
      upvotes: 31,
      downvotes: 3,
      commentCount: 15,
      timeAgo: "8 hours ago",
      category: "Home Care",
      tags: ["pricing", "comparison", "companion-care"]
    },
    {
      id: 5,
      title: "Success story: Found amazing aide through word-of-mouth referral",
      content: "After struggling with two different agencies, I found our current aide through a recommendation from Dad's doctor. She's been with us for 6 months now and is absolutely wonderful. Just wanted to remind everyone that sometimes the best resources come from healthcare providers who see which aides consistently do great work.",
      author: {
        firstName: "Patricia",
        lastName: "W.",
        profileImageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face&auto=format",
        location: "Portland, OR"
      },
      upvotes: 67,
      downvotes: 0,
      commentCount: 9,
      timeAgo: "12 hours ago",
      category: "Home Care",
      tags: ["success-story", "referrals", "healthcare-providers"],
      isResolved: true
    },
    {
      id: 6,
      title: "Background check red flags - aide has misdemeanor from 15 years ago",
      content: "The background check for a potential aide shows a misdemeanor from 15 years ago (non-violent, financial related). The agency says it's within their acceptance policy, but I'm feeling hesitant. How do you weigh past issues against current qualifications? She interviewed really well and has excellent references.",
      author: {
        firstName: "Robert",
        lastName: "H.",
        profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format",
        location: "Miami, FL"
      },
      upvotes: 12,
      downvotes: 4,
      commentCount: 18,
      timeAgo: "1 day ago",
      category: "Home Care",
      tags: ["background-checks", "safety", "decision-making"]
    },
    {
      id: 7,
      title: "Emergency backup plan when regular aide calls in sick?",
      content: "Our regular aide called in sick this morning and the agency can't provide a substitute until tomorrow. Mom needs help with medication and meals. What do other families do for emergency coverage? Should we have multiple agencies lined up?",
      author: {
        firstName: "David",
        lastName: "L.",
        profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format",
        location: "Chicago, IL"
      },
      upvotes: 29,
      downvotes: 1,
      commentCount: 11,
      timeAgo: "1 day ago",
      category: "Home Care",
      tags: ["emergency", "backup", "planning"]
    },
    {
      id: 8,
      title: "Male vs female caregivers - Dad is more comfortable with men",
      content: "My father is more comfortable with male caregivers for personal care tasks. Most agencies seem to have predominantly female staff. Has anyone had success specifically requesting male caregivers? Are there agencies that specialize in this?",
      author: {
        firstName: "Angela",
        lastName: "S.",
        profileImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face&auto=format",
        location: "Dallas, TX"
      },
      upvotes: 21,
      downvotes: 2,
      commentCount: 7,
      timeAgo: "2 days ago",
      category: "Home Care",
      tags: ["male-caregivers", "comfort", "personal-care"]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Search */}
      <div className="bg-[#0B666B]/90 border-b border-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left: Topic Title */}
            <div className="col-span-3 flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-white flex items-center mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-300 mr-3"></div>
                {topicName}
              </h1>
              <div className="text-left">
                <p className="text-white text-lg font-medium">
                  {convertedPosts.length} discussions
                </p>
                <p className="text-white text-sm mt-1">
                  Join the conversation
                </p>
              </div>
            </div>
            
            {/* Center: Search Bar and Sort Options */}
            <div className="col-span-6 flex flex-col items-center">
              <div className="relative w-full mb-5">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent shadow-sm"
                />
              </div>
              
              {/* Sort Options */}
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-white">Sort by:</span>
                <div className="flex space-x-2">
                {['hot', 'new', 'top'].map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort as any)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      sortBy === sort
                        ? 'bg-white text-teal-700'
                        : 'text-white hover:text-white hover:bg-teal-600'
                    }`}
                  >
                    {sort === 'hot' && <TrendingUp className={`w-4 h-4 inline mr-1 ${sortBy === sort ? 'text-teal-700' : 'text-teal-400'}`} />}
                    {sort === 'new' && <Clock className="w-4 h-4 inline mr-1 text-white" />}
                    {sort === 'top' && <Star className="w-4 h-4 inline mr-1 text-white" />}
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
                </div>
              </div>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="col-span-3 flex flex-col gap-3 justify-self-end">
              <Button 
                className="bg-white text-teal-700 hover:bg-teal-50 border border-white shadow-sm"
                onClick={() => setShowNewPostModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                onClick={() => setShowNewTopicModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Topic
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-4">
            <DynamicDiscussionTopicsSidebar />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8">

            {/* Posts List */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading discussions...</p>
                </div>
              ) : posts && posts.length > 0 ? (
                posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : convertedPosts.length > 0 ? (
                convertedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No posts yet. Be the first to start a discussion!</p>
                </div>
              )}
            </div>

            {/* Load More */}
            <div className="mt-8 text-center">
              <Button variant="outline" className="px-8">
                Load More Posts
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      <Dialog open={showNewPostModal} onOpenChange={setShowNewPostModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Post in {topicName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewPostSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Post Title</Label>
              <Input
                id="post-title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Enter your post title..."
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-content">Content</Label>
              <Textarea
                id="post-content"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your thoughts, questions, or experiences..."
                className="w-full min-h-[120px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewPostModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={createPostMutation.isPending}
              >
                {createPostMutation.isPending ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Topic Modal */}
      <Dialog open={showNewTopicModal} onOpenChange={setShowNewTopicModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Topic</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewTopicSubmit} className="space-y-4">
            {/* Hierarchical Selection */}
            <div className="space-y-2">
              <Label>Discussion Forum</Label>
              <Select 
                value={selectedDiscussionForum} 
                onValueChange={(value) => {
                  setSelectedDiscussionForum(value);
                  setSelectedMainTopic(''); // Reset main topic when forum changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a discussion forum..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(discussionForums) && discussionForums.map((forum: any) => (
                    <SelectItem key={forum.id} value={forum.id.toString()}>
                      {forum.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Main Topic</Label>
              <Select 
                key={`main-topic-${selectedDiscussionForum}`}
                value={selectedMainTopic} 
                onValueChange={setSelectedMainTopic}
                disabled={!selectedDiscussionForum}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDiscussionForum ? "Select a main topic..." : "Select discussion forum first"} />
                </SelectTrigger>
                <SelectContent>
                  {!selectedDiscussionForum ? (
                    <SelectItem value="no-forum" disabled>Select a discussion forum first</SelectItem>
                  ) : mainTopicsLoading ? (
                    <SelectItem value="loading" disabled>Loading main topics...</SelectItem>
                  ) : Array.isArray(mainTopics) && mainTopics.length > 0 ? (
                    mainTopics.map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.id.toString()}>
                        {topic.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-topics" disabled>No main topics available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-title">New Sub-Topic Title</Label>
              <Input
                id="topic-title"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="Enter sub-topic name..."
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-post-title">Title of Your First Post</Label>
              <Input
                id="first-post-title"
                value={newTopicFirstPostTitle}
                onChange={(e) => setNewTopicFirstPostTitle(e.target.value)}
                placeholder="Enter first post title..."
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-post-content">First Post Content</Label>
              <Textarea
                id="first-post-content"
                value={newTopicFirstPostContent}
                onChange={(e) => setNewTopicFirstPostContent(e.target.value)}
                placeholder="Start the conversation in your new topic..."
                className="w-full min-h-[120px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewTopicModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={createTopicMutation.isPending}
              >
                {createTopicMutation.isPending ? "Creating..." : "Create Topic"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}