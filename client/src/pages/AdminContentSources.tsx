import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, GripVertical, ExternalLink } from "lucide-react";
import MainLayout from "@/components/MainLayout";

interface ContentSource {
  id: number;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  embedCode: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  orderIndex: number;
}

interface FormData {
  categoryId: string;
  name: string;
  description: string;
  embedCode: string;
  websiteUrl: string;
  isActive: boolean;
  orderIndex: number;
}

const categories = [
  { id: "authors", name: "Authors" },
  { id: "newspapers", name: "Newspapers & Magazines" },
  { id: "bloggers", name: "Bloggers & Writers" },
  { id: "podcasters", name: "Podcasters & YouTubers" },
  { id: "retirement-care-pros", name: "Retirement & Care Professionals" },
  { id: "industry-leaders", name: "Industry Thought Leaders" }
];

export default function AdminContentSources() {
  const { toast } = useToast();
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [draggedItem, setDraggedItem] = useState<ContentSource | null>(null);
  
  const initialFormData: FormData = {
    categoryId: "",
    name: "",
    description: "",
    embedCode: "",
    websiteUrl: "",
    isActive: true,
    orderIndex: 0
  };
  
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Fetch all content sources
  const { data: sources = [], isLoading } = useQuery<ContentSource[]>({
    queryKey: ['/api/content-sources/all'] // Using a different endpoint for admin
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ContentSource>) => {
      const categoryName = categories.find(c => c.id === data.categoryId)?.name || "";
      return apiRequest("POST", "/api/content-sources", { 
        ...data, 
        categoryName 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources'] });
      toast({ title: "Success", description: "Content source created" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create content source",
        variant: "destructive" 
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContentSource> }) => {
      const categoryName = categories.find(c => c.id === data.categoryId)?.name || "";
      return apiRequest("PUT", `/api/content-sources/${id}`, { 
        ...data, 
        categoryName 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources'] });
      toast({ title: "Success", description: "Content source updated" });
      setIsDialogOpen(false);
      setEditingSource(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update content source",
        variant: "destructive" 
      });
    }
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ categoryId, sourceIds }: { categoryId: string; sourceIds: number[] }) => {
      return apiRequest("PUT", "/api/content-sources/reorder", { categoryId, sourceIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources'] });
      toast({ title: "Success", description: "Order updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update order",
        variant: "destructive" 
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/content-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-sources'] });
      toast({ title: "Success", description: "Content source deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete content source",
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSource(null);
  };

  const handleEdit = (source: ContentSource) => {
    setEditingSource(source);
    setFormData({
      categoryId: source.categoryId,
      name: source.name,
      description: source.description || "",
      embedCode: source.embedCode || "",
      websiteUrl: source.websiteUrl || "",
      isActive: source.isActive,
      orderIndex: source.orderIndex
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.categoryId || !formData.name) {
      toast({ 
        title: "Error", 
        description: "Category and name are required",
        variant: "destructive" 
      });
      return;
    }

    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this content source?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, source: ContentSource) => {
    setDraggedItem(source);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetSource: ContentSource) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetSource.id) {
      return;
    }

    // Only allow reordering within the same category
    if (draggedItem.categoryId !== targetSource.categoryId) {
      toast({
        title: "Error",
        description: "Cannot move sources between categories",
        variant: "destructive"
      });
      return;
    }

    // Get all sources in this category
    const categorySources = sources
      .filter(s => s.categoryId === targetSource.categoryId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Remove dragged item and insert at new position
    const filteredSources = categorySources.filter(s => s.id !== draggedItem.id);
    const targetIndex = filteredSources.findIndex(s => s.id === targetSource.id);
    
    // Insert dragged item before or after target based on position
    const newOrder = [...filteredSources];
    newOrder.splice(targetIndex + 1, 0, draggedItem);

    // Update order and send to server
    const sourceIds = newOrder.map(s => s.id);
    reorderMutation.mutate({ categoryId: targetSource.categoryId, sourceIds });

    setDraggedItem(null);
  };

  // Filter sources by category
  const filteredSources = selectedCategory === "all" 
    ? sources 
    : sources.filter(s => s.categoryId === selectedCategory);

  // Group sources by category for display
  const groupedSources = categories.reduce((acc, category) => {
    acc[category.id] = filteredSources
      .filter(s => s.categoryId === category.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    return acc;
  }, {} as Record<string, ContentSource[]>);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="animate-pulse">Loading content sources...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Manage Content Sources</h1>
            <p className="text-gray-600 mt-1">Add and manage news sources for "This Week by..."</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Content Source
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? 'Edit Content Source' : 'Add New Content Source'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(value) => setFormData({...formData, categoryId: value})}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Source Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., The New York Times - Aging"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of the source"
                  />
                </div>

                <div>
                  <Label htmlFor="websiteUrl">Website URL (optional)</Label>
                  <Input
                    id="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="embedCode">
                    Embed Code (optional)
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste the embed code from EmbedSocial or other services
                    </span>
                  </Label>
                  <Textarea
                    id="embedCode"
                    value={formData.embedCode}
                    onChange={(e) => setFormData({...formData, embedCode: e.target.value})}
                    placeholder='<div class="embedsocial-hashtag" data-ref="..."></div><script>...</script>'
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="orderIndex">Display Order</Label>
                  <Input
                    id="orderIndex"
                    type="number"
                    value={formData.orderIndex}
                    onChange={(e) => setFormData({...formData, orderIndex: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">Lower numbers appear first</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                  />
                  <Label htmlFor="isActive">Active (visible on the site)</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingSource ? 'Update' : 'Create'} Source
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category filter */}
        <div className="mb-6">
          <Label htmlFor="filter">Filter by category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="filter" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content sources list */}
        <div className="space-y-6">
          {Object.entries(groupedSources).map(([categoryId, sources]) => {
            if (sources.length === 0 && selectedCategory !== "all") return null;
            
            const category = categories.find(c => c.id === categoryId);
            
            return (
              <Card key={categoryId}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {category?.name} ({sources.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sources.length === 0 ? (
                    <p className="text-gray-500">No sources in this category</p>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source, index) => (
                        <div 
                          key={source.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, source)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, source)}
                          className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-move ${
                            draggedItem?.id === source.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{source.name}</span>
                                {!source.isActive && (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                    Inactive
                                  </span>
                                )}
                                {source.embedCode && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    Has embed
                                  </span>
                                )}
                              </div>
                              {source.description && (
                                <p className="text-sm text-gray-600">{source.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>Order: {source.orderIndex}</span>
                                {source.websiteUrl && (
                                  <a 
                                    href={source.websiteUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Website
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(source)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(source.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}