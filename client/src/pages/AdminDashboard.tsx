import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink } from "lucide-react"; // Import ExternalLink
import { useAuth } from "@/hooks/useAuth";

interface Application {
  id: number;
  profession: string;
  credentials?: string;
  bio?: string;
  createdAt: string;
  profileImageUrl?: string; // Add profileImageUrl
  licenseFileUrl?: string;  // Add licenseFileUrl
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: applications = [], isLoading, error } = useQuery<Application[]>({
    queryKey: ['/api/admin/expert-applications'],
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'verified' | 'rejected' }) => 
      apiRequest('POST', `/api/admin/expert-applications/${id}/review`, { status }),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/expert-applications'] });
      
      // Explicitly invalidate the specific expert profile if we have the userId
      if (data?.application?.userId) {
        queryClient.invalidateQueries({ queryKey: ['/api/experts', data.application.userId, 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['/api/experts', data.application.userId] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts/user', data.application.userId] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts/by-author', data.application.userId] });
      }
      
      // Invalidate ALL expert-related queries (list, details, profiles) - same broad pattern as user approval
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/experts'
      });
      // Invalidate ALL post queries (list and details with expert badges)  
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/posts' || query.queryKey[0] === '/api/posts/user' || query.queryKey[0] === '/api/posts/by-author'
      });
      // Invalidate user profile queries that may show expert status
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/users')
      });
      toast({
        title: "Application Reviewed",
        description: "The application status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Could not update application status.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading applications...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error fetching applications: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      {/* Admin Navigation */}
      <div className="mb-6 flex gap-4">
        <a 
          href="/admin/dashboard" 
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
        >
          Expert Applications
        </a>
        <a 
          href="/admin/content-sources" 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Content Sources
        </a>
        <a 
          href="/admin/search-logs" 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Search Analytics
        </a>
        <a 
          href="/admin/social-media-embeds" 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Social Media Embeds
        </a>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Expert Application Review</CardTitle>
          <CardDescription>
            Review and approve or reject pending expert applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <p className="text-gray-500">No pending applications.</p>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{app.user.firstName} {app.user.lastName} - <span className="font-normal">{app.profession}</span></h3>
                      <p className="text-sm text-gray-500">{app.user.email}</p>
                      <p className="text-sm mt-2"><strong>Bio:</strong> {app.bio}</p>
                      <p className="text-sm mt-1"><strong>Credentials:</strong> {app.credentials}</p>
                      
                      {/* Display profile image and license file URLs */}
                      <div className="mt-2 space-y-1">
                        {app.profileImageUrl && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <strong>Profile Image:</strong>
                            <a href={app.profileImageUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline flex items-center">
                              View <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </p>
                        )}
                        {app.licenseFileUrl && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <strong>License File:</strong>
                            <a href={app.licenseFileUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline flex items-center">
                              View <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">Submitted on: {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                        onClick={() => reviewMutation.mutate({ id: app.id, status: 'verified' })}
                        disabled={reviewMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => reviewMutation.mutate({ id: app.id, status: 'rejected' })}
                        disabled={reviewMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}