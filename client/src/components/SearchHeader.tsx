import { useState, useEffect } from "react";
import { Search, Plus, Clock, Star, TrendingUp, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import NewPostModal from "@/components/NewPostModal";
import { Link } from "wouter";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface SearchHeaderProps {
  title?: string;
  showActionButtons?: boolean;
  sortBy?: "hot" | "new" | "top";
  onSortChange?: (sort: "hot" | "new" | "top") => void;
  onSearch?: (query: string) => void;
}

export default function SearchHeader({
  title = "All Things Retirement. All Things Caring.",
  showActionButtons = true,
  sortBy: propSortBy,
  onSortChange,
  onSearch,
}: SearchHeaderProps) {
  // Get current user for greeting - optimized loading
  const { data: user } = useQuery<{ firstName?: string }>({
    queryKey: ['/api/user'],
    staleTime: 10 * 60 * 1000, // 10 minutes - user data changes rarely
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  const [localSortBy, setLocalSortBy] = useState<"hot" | "new" | "top">("hot");
  const sortBy = propSortBy || localSortBy;
  const setSortBy = onSortChange || setLocalSortBy;
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  // Fetch dynamic search phrases from database - optimized with longer cache
  const { data: searchPhrasesData } = useQuery<{ phrase: string }[]>({
    queryKey: ["/api/search-phrases"],
    staleTime: 60 * 60 * 1000, // 1 hour - search phrases change rarely
    gcTime: 2 * 60 * 60 * 1000, // Keep in memory for 2 hours
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Don't refetch on component remount
  });

  // Extract phrases from API response or fallback to empty array
  const searchPhrases = searchPhrasesData?.map((item) => item.phrase) || [];

  // Typewriter effect for search placeholder
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isTyping && searchPhrases.length > 0) {
      const currentPhrase = searchPhrases[currentPhraseIndex];

      if (currentPhrase && displayedText.length < currentPhrase.length) {
        timeoutId = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, 50);
      } else {
        timeoutId = setTimeout(() => {
          setIsTyping(false);
          setDisplayedText("");
          setCurrentPhraseIndex((prev) => (prev + 1) % searchPhrases.length);
          setTimeout(() => setIsTyping(true), 500);
        }, 2500);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [displayedText, currentPhraseIndex, isTyping, searchPhrases]);

  return (
    <>
      <div className="bg-[#0B666B]/90 border-b border-teal-700 relative">
        <div className="px-[30px]" style={{ paddingTop: '65px', paddingBottom: '65px' }}>
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left: Greeting aligned above sidebar - matches MainLayout structure */}
            <div className="lg:col-span-3 flex items-center justify-start" style={{ height: '80px' }}>
              {user && (
                <h1 className="text-xl font-medium text-white">
                  {getGreeting()}, {user.firstName}
                </h1>
              )}
            </div>

            {/* Center: Search Bar and Sort Options - matches MainLayout content area exactly */}
            <div className="lg:col-span-6">
              <div className="flex flex-col items-center justify-center max-w-3xl mx-auto" style={{ height: '80px' }}>
                <div className="relative w-full mb-5">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  placeholder={displayedText + (isTyping ? "|" : "")}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (searchValue.trim() && onSearch) {
                        onSearch(searchValue.trim());
                      }
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent shadow-sm resize-none"
                  style={{ minHeight: '80px', lineHeight: '1.5' }}
                  rows={3}
                  data-testid="search-input"
                />
              </div>

                {/* Sort Options and Action Buttons */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-white">Sort by:</span>
                    <div className="flex space-x-2">
                      {["hot", "new", "top"].map((sort) => (
                        <button
                          key={sort}
                          onClick={() => setSortBy(sort as any)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            sortBy === sort
                              ? "bg-white text-teal-700"
                              : "text-white hover:text-white hover:bg-teal-600"
                          }`}
                        >
                          {sort === "hot" && (
                            <TrendingUp
                              className={`w-4 h-4 inline mr-1 ${sortBy === sort ? "text-teal-700" : "text-teal-400"}`}
                            />
                          )}
                          {sort === "new" && (
                            <Clock className="w-4 h-4 inline mr-1 text-white" />
                          )}
                          {sort === "top" && (
                            <Star className="w-4 h-4 inline mr-1 text-white" />
                          )}
                          {sort.charAt(0).toUpperCase() + sort.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons - now inline with sort options */}
                  {showActionButtons && (
                    <div className="flex space-x-3">
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
                  )}
                </div>
              </div>
            </div>

            {/* Right: Reserved for future ads - matches 25/50/25 structure */}
            <div className="lg:col-span-3">
              {/* Reserved space for advertisements */}
            </div>

          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewPostModal && (
        <NewPostModal
          open={showNewPostModal}
          onClose={() => setShowNewPostModal(false)}
          mode="post"
        />
      )}

      {showNewTopicModal && (
        <NewPostModal
          open={showNewTopicModal}
          onClose={() => setShowNewTopicModal(false)}
          mode="topic"
        />
      )}
    </>
  );
}
