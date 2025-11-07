import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/MainLayout";
import { Loader2, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SocialMediaEmbed {
  id: number;
  type: string;
  name: string;
  embedCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSocialMediaEmbeds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [newEmbed, setNewEmbed] = useState({
    type: "todaysnews",
    name: "",
    embedCode: ""
  });

  // Fetch all embeds grouped by type
  const { data: todaysNewsEmbeds = [], isLoading: loadingTodays } = useQuery<SocialMediaEmbed[]>({
    queryKey: ["/api/social-media-embeds/todaysnews"],
  });

  const { data: linkedinEmbeds = [], isLoading: loadingLinkedin } = useQuery<SocialMediaEmbed[]>({
    queryKey: ["/api/social-media-embeds/linkedin"],
  });

  const { data: xPostsEmbeds = [], isLoading: loadingX } = useQuery<SocialMediaEmbed[]>({
    queryKey: ["/api/social-media-embeds/xposts"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (embed: typeof newEmbed) => 
      apiRequest("POST", "/api/social-media-embeds", embed),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Social media embed created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-media-embeds"] });
      setNewEmbed({ type: "todaysnews", name: "", embedCode: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create social media embed",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, embedCode }: { id: number; embedCode: string }) =>
      apiRequest("PUT", `/api/social-media-embeds/${id}`, { embedCode }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Embed code updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-media-embeds"] });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update embed code",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/social-media-embeds/${id}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Social media embed deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-media-embeds"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete social media embed",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (embed: SocialMediaEmbed) => {
    setEditingId(embed.id);
    setEditingCode(embed.embedCode || "");
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({ id, embedCode: editingCode });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingCode("");
  };

  const handleCreate = () => {
    if (!newEmbed.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the embed",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newEmbed);
  };

  const renderEmbedGroup = (title: string, embeds: SocialMediaEmbed[], isLoading: boolean) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Manage RSS.app embed codes for {title.toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : embeds.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No embeds added yet</p>
        ) : (
          <div className="space-y-4">
            {embeds.map((embed) => (
              <div key={embed.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{embed.name}</h4>
                  <div className="flex gap-2">
                    {editingId !== embed.id && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(embed)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(embed.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {editingId === embed.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingCode}
                      onChange={(e) => setEditingCode(e.target.value)}
                      placeholder="Paste your RSS.app embed code here..."
                      className="min-h-[150px] font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(embed.id)}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    {embed.embedCode ? (
                      <div className="bg-gray-50 p-2 rounded font-mono text-xs overflow-x-auto">
                        {embed.embedCode.substring(0, 100)}...
                      </div>
                    ) : (
                      <span className="italic text-gray-400">No embed code added</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Social Media Embeds Management</h1>
        
        {/* Add New Embed Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Embed</CardTitle>
            <CardDescription>
              Create a new RSS.app embed for social media feeds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={newEmbed.type}
                onValueChange={(value) => setNewEmbed({ ...newEmbed, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todaysnews">Today's News</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="xposts">X Posts</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Feed name (e.g., 'Tech News', 'Industry Updates')"
                value={newEmbed.name}
                onChange={(e) => setNewEmbed({ ...newEmbed, name: e.target.value })}
              />
              
              <Button 
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Embed
              </Button>
            </div>
            
            {newEmbed.name && (
              <div className="mt-4">
                <Textarea
                  placeholder="Paste your RSS.app embed code here (optional, can be added later)..."
                  value={newEmbed.embedCode}
                  onChange={(e) => setNewEmbed({ ...newEmbed, embedCode: e.target.value })}
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Embed Groups */}
        {renderEmbedGroup("Today's News", todaysNewsEmbeds, loadingTodays)}
        {renderEmbedGroup("LinkedIn", linkedinEmbeds, loadingLinkedin)}
        {renderEmbedGroup("X Posts", xPostsEmbeds, loadingX)}
      </div>
    </MainLayout>
  );
}