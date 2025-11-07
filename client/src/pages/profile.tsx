import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  ThumbsUp,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Star,
  Shield,
  UserCheck
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [match, params] = useRoute("/profile/:id");
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = params?.id || currentUser?.id;

  // If no specific user ID and we have current user, use current user data directly
  const shouldFetchUser = userId && userId !== currentUser?.id;
  
  // Fetch user profile data only if it's not the current user
  const { data: fetchedUser, isLoading: userLoading } = useQuery({
    queryKey: [`/api/users/${userId}`],
    enabled: !!shouldFetchUser,
    retry: false,
  });
  
  // Use current user data if viewing own profile, otherwise use fetched user
  const user: any = shouldFetchUser ? fetchedUser : currentUser;

  // Fetch user's posts
  const { data: userPosts = [], isLoading: postsLoading } = useQuery<any[]>({
    queryKey: [`/api/posts/user/${userId}`],
    enabled: !!userId,
    retry: false,
  });

  // Admin functionality: Fetch unapproved experts (only for admins viewing their own profile)
  const isAdminViewingOwnProfile = !shouldFetchUser && currentUser?.role === 'admin';
  const { data: unapprovedExperts = [], isLoading: unapprovedLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/unapproved-experts'],
    enabled: isAdminViewingOwnProfile,
    retry: false,
  });

  // Admin functionality: Approve user mutation
  const approveMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('POST', `/api/admin/approve-user/${userId}`, {}),
    onSuccess: () => {
      // Comprehensive cache invalidation for real-time badge updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unapproved-experts'] });
      // Invalidate ALL expert-related queries (list, details, profiles)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/experts')
      });
      // Invalidate ALL post queries (list and details with expert badges)  
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/posts')
      });
      // Invalidate user profile queries that may show expert status
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/users')
      });
      toast({
        title: "User Approved",
        description: "The expert has been approved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Could not approve user.",
        variant: "destructive",
      });
    },
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  const getTimeColor = (timeAgo: string) => {
    if (timeAgo && timeAgo.includes('hour')) return 'text-green-600';
    if (timeAgo && timeAgo.includes('day')) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-4">The user profile you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center border-4 border-white shadow-lg">
                <User className="w-8 h-8 text-gray-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-teal-700">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
                {user.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {user.location}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-teal-700 mb-4">Community Contributions</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">Posts</span>
                  </div>
                  <span className="font-semibold text-gray-900">{userPosts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ThumbsUp className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">Total Helpful Votes</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {userPosts.reduce((total, post) => total + (post.helpfulVotes || 0), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* My Bookings - Only show for current user viewing their own profile */}
            {!shouldFetchUser && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-teal-700 mb-4">My Consultations</h2>
                <Link href="/my-bookings">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Bookings
                  </Button>
                </Link>
              </div>
            )}

            {/* Social Media Embeds - Only show for admins viewing their own profile */}
            {isAdminViewingOwnProfile && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-teal-700 mb-4">Social Media Embeds</h2>
                <Link href="/admin/social-media-embeds">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    <Calendar className="w-4 h-4 mr-2" />
                    Manage Embeds
                  </Button>
                </Link>
              </div>
            )}

            {/* Manage Sources - Only show for admins viewing their own profile */}
            {isAdminViewingOwnProfile && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-teal-700 mb-4">Content Sources</h2>
                <Link href="/admin/content-sources">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    Manage Sources
                  </Button>
                </Link>
              </div>
            )}

            {/* About Me Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-teal-700 mb-4">About Me</h2>
              {user?.introduction ? (
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">{user.introduction}</p>
                  {user.caregivingRole && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Caregiving Role:</span>
                      <span className="text-sm text-gray-700 ml-2">{user.caregivingRole}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">No introduction provided yet.</p>
              )}
            </div>
          </div>

          {/* User Posts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Admin Approval Section - Show above Recent Posts for admins */}
            {isAdminViewingOwnProfile && (
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-teal-700 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Pending Members
                  </CardTitle>
                  <CardDescription>
                    Review and approve expert applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {unapprovedLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto"></div>
                    </div>
                  ) : unapprovedExperts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending expert approvals</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">Name</TableHead>
                              <TableHead className="w-[250px]">Email</TableHead>
                              <TableHead className="w-[150px]">Joined Date</TableHead>
                              <TableHead className="w-[120px] text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unapprovedExperts.map((expert: any) => (
                              <TableRow key={expert.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium text-sm">
                                  {expert.firstName} {expert.lastName}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {expert.email}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {new Date(expert.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                    onClick={() => approveMutation.mutate(expert.id)}
                                    disabled={approveMutation.isPending}
                                    data-testid={`button-approve-${expert.id}`}
                                  >
                                    <UserCheck className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {postsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                  </div>
                ) : userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex space-x-4">
                        {/* Vote buttons */}
                        <div className="flex flex-col items-center space-y-1 min-w-[40px]">
                          <button className="p-1 rounded transition-colors text-gray-400 hover:text-orange-600 hover:bg-orange-50">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900">
                            {post.helpfulVotes || 0}
                          </span>
                          <button className="p-1 rounded transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Post content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <Link href={`/post/${post.id}`}>
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-teal-700 cursor-pointer">
                                {post.title}
                              </h3>
                            </Link>
                            {post.isResolved && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 ml-4">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {post.content}
                          </p>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-4">
                              <Badge variant="outline" className="text-teal-700 border-teal-200">
                                {post.category?.name || 'General'}
                              </Badge>
                              <div className={`flex items-center ${getTimeColor(formatTimeAgo(post.createdAt))}`}>
                                <Clock className="w-4 h-4 mr-1" />
                                {formatTimeAgo(post.createdAt)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-500">
                              <MessageSquare className="w-4 h-4" />
                              <span>{post.commentCount || 0} comments</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No posts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}