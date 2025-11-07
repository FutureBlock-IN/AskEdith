import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ForumSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectForum: (forum: any) => void;
}

export function ForumSearchModal({ open, onOpenChange, onSelectForum }: ForumSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Update ForumSearchModal.tsx to connect to real API
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/forums/search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await fetch(`/api/forums/search?q=${encodeURIComponent(searchQuery)}`);
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSelectForum = (forum: any) => {
    onSelectForum(forum);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Forums</DialogTitle>
          <DialogDescription>
            Find community forums created by other users. These don't appear in the main sidebar but are discoverable through search.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search for forums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchQuery.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              Type at least 2 characters to search for forums
            </div>
          )}
          
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No forums found matching "{searchQuery}"
            </div>
          )}
          
          {searchResults.length > 0 && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {searchResults.map((forum: any) => (
                <div
                  key={forum.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectForum(forum)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{forum.name}</h3>
                      {forum.description && (
                        <p className="text-sm text-gray-600 mt-1">{forum.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="w-3 h-3 mr-1" />
                          {forum.postCount || 0} posts
                        </div>
                        {forum.createdAt && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            Created {new Date(forum.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    {!forum.isOfficial && (
                      <Badge variant="secondary" className="ml-2">
                        Community
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}