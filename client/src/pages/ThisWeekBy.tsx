import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Heart,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/MainLayout";
import EmbedContent from "@/components/EmbedContent";
import DynamicDiscussionTopicsSidebar from "@/components/DynamicDiscussionTopicsSidebar";

interface Source {
  id: number;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  embedCode: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  sources: Source[];
}

// Category definitions
const categoryDefinitions = [
  { id: "authors", name: "Authors" },
  { id: "newspapers", name: "Newspapers & Magazines" },
  { id: "bloggers", name: "Bloggers & Writers" },
  { id: "podcasters", name: "Podcasters & YouTubers" },
  { id: "retirement-care-pros", name: "Retirement & Care Professionals" },
  { id: "industry-leaders", name: "Industry Thought Leaders" },
];

export default function ThisWeekBy() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);


  // Fetch all content sources
  const { data: sources = [], isLoading } = useQuery<Source[]>({
    queryKey: ["/api/content-sources"],
  });

  // Fetch user's favorite sources
  const { data: favorites = [] } = useQuery<Source[]>({
    queryKey: ["/api/content-sources/favorites"],
  });

  // Mutation for toggling favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      return apiRequest("POST", `/api/content-sources/${sourceId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/content-sources/favorites"],
      });
      toast({
        title: "Success",
        description: "Favorite status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  // Helper function to check if a source is favorited
  const isFavorited = useCallback(
    (sourceId: number) => {
      return favorites.some((fav: Source) => fav.id === sourceId);
    },
    [favorites],
  );

  // Group sources by category using useMemo to prevent infinite loops
  const categories = useMemo(() => {
    if (sources.length > 0) {
      return categoryDefinitions.map((catDef) => {
        const categorySources = sources.filter(
          (source: Source) => source.categoryId === catDef.id,
        );

        // Sort sources with favorites first
        const sortedSources = categorySources.sort((a: Source, b: Source) => {
          const aIsFavorite = favorites.some((fav: Source) => fav.id === a.id);
          const bIsFavorite = favorites.some((fav: Source) => fav.id === b.id);

          if (aIsFavorite && !bIsFavorite) return -1;
          if (!aIsFavorite && bIsFavorite) return 1;

          // If both are favorites or both are not, maintain original order
          return a.orderIndex - b.orderIndex;
        });

        return {
          id: catDef.id,
          name: catDef.name,
          sources: sortedSources,
        };
      });
    } else {
      // If no sources from API, return empty categories
      return categoryDefinitions.map((catDef) => ({
        id: catDef.id,
        name: catDef.name,
        sources: [],
      }));
    }
  }, [sources, favorites]);

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setExpandedSource(null);
    } else {
      setSelectedCategory(categoryId);
      setExpandedSource(null);
    }
  };

  const handleSourceClick = (sourceId: number) => {
    setExpandedSource(
      expandedSource === sourceId.toString() ? null : sourceId.toString(),
    );
  };

  const selectedCategoryData = categories.find(
    (cat) => cat.id === selectedCategory,
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSidebar={false}>
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Sidebar - 25% width (3/12) */}
        <div className="lg:col-span-3">
          <DynamicDiscussionTopicsSidebar />
        </div>

        {/* Main Content - 75% width (9/12) */}
        <div className="lg:col-span-9">
          <div>
        {/* Categories - Compact Horizontal Layout */}
        <div className="mb-9">
          <h2 className="text-lg font-semibold mb-3 text-center">
            This Week by your community's favorite sources . . .
          </h2>
          <p className="text-center text-gray-600 mb-4 max-w-7xl mx-auto leading-[1.75rem]">
            Searching the web today is overwhelming. So we searched it and
            curated it for you. See who's talking retirement or care this week
            and what they posted. When you want to see more, just click to go to
            their page! If there is a voice you know that you think we should
            add, just let us know!
            <br />
          </p>
          <div className="mb-10"></div>
          <div className="grid grid-cols-6 gap-2">
            {categories.map((category) => {
              // Split category name for two-line display
              const words = category.name.split(/\s+/);
              let line1, line2;

              if (words.length === 2) {
                [line1, line2] = words;
              } else if (category.name.includes("&")) {
                const parts = category.name.split("&");
                line1 = parts[0].trim();
                line2 = "& " + parts[1].trim();
              } else {
                line1 = words[0];
                line2 = words.slice(1).join(" ");
              }

              return (
                <button
                  key={category.id}
                  className={`p-3 text-sm border rounded-lg text-center transition-colors ${
                    selectedCategory === category.id
                      ? "bg-[#23757a] border-[#23757a] text-[#fefefe]"
                      : "bg-white border-gray-300 hover:border-gray-400"
                  }`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="font-medium">{line1}</div>
                  <div className="font-medium">{line2} ({category.sources.length})</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sources Display */}
        {selectedCategory && selectedCategoryData ? (
          <div>
            {selectedCategoryData.sources.length > 0 ? (
              <div>
                {/* Render sources in rows of 3 with inline accordion */}
                {(() => {
                  const sourcesPerRow = 3;
                  const rows = [];

                  for (
                    let i = 0;
                    i < selectedCategoryData.sources.length;
                    i += sourcesPerRow
                  ) {
                    const rowSources = selectedCategoryData.sources.slice(
                      i,
                      i + sourcesPerRow,
                    );
                    const rowIndex = Math.floor(i / sourcesPerRow);

                    // Check if any source in this row is expanded
                    const expandedSourceInRow = rowSources.find(
                      (source) => source.id.toString() === expandedSource,
                    );

                    rows.push(
                      <div key={`row-${rowIndex}`}>
                        {/* Source cards for this row */}
                        <div
                          className={`grid grid-cols-3 gap-4 ${rowIndex > 0 ? "mt-4" : ""}`}
                        >
                          {rowSources.map((source, index) => (
                            <div
                              key={source.id}
                              className={`pb-3 ${
                                rowIndex > 0
                                  ? "border-t border-gray-200 pt-4"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => handleSourceClick(source.id)}
                                >
                                  <h4 className="text-blue-600 hover:underline text-sm font-medium">
                                    {source.name}
                                  </h4>
                                  {source.description && (
                                    <p className="text-gray-600 text-xs mt-1">
                                      {source.description}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavoriteMutation.mutate(source.id);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  disabled={toggleFavoriteMutation.isPending}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      isFavorited(source.id)
                                        ? "text-red-500 fill-red-500"
                                        : "text-gray-400"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          ))}
                          {/* Fill empty grid cells to maintain layout */}
                          {rowSources.length < sourcesPerRow &&
                            Array(sourcesPerRow - rowSources.length)
                              .fill(null)
                              .map((_, idx) => (
                                <div key={`empty-${rowIndex}-${idx}`} />
                              ))}
                        </div>

                        {/* Expanded content immediately after this row */}
                        {expandedSourceInRow && (
                          <div className="relative z-10 -mx-4 mt-4 mb-6">
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-semibold">
                                    {expandedSourceInRow.name}
                                  </h3>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavoriteMutation.mutate(
                                        expandedSourceInRow.id,
                                      );
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    disabled={toggleFavoriteMutation.isPending}
                                  >
                                    <Heart
                                      className={`w-5 h-5 ${
                                        isFavorited(expandedSourceInRow.id)
                                          ? "text-red-500 fill-red-500"
                                          : "text-gray-400"
                                      }`}
                                    />
                                  </button>
                                </div>
                                <div className="flex items-center gap-3">
                                  {expandedSourceInRow.websiteUrl && (
                                    <a
                                      href={expandedSourceInRow.websiteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Visit website
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setExpandedSource(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <ChevronUp className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>

                              <div
                                className="bg-gray-50 rounded-lg p-6 flex flex-col"
                                style={{ minHeight: "1200px" }}
                              >
                                <div className="flex-1">
                                  {expandedSourceInRow.embedCode ? (
                                    <div className="overflow-auto h-full">
                                      <EmbedContent
                                        embedCode={expandedSourceInRow.embedCode}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <div className="text-center">
                                        <p className="text-gray-500 mb-4">
                                          No embed content available yet.
                                        </p>
                                        {expandedSourceInRow.websiteUrl && (
                                          <a
                                            href={expandedSourceInRow.websiteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                          >
                                            Visit website →
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-6 text-center">
                                  <button
                                    onClick={() => {
                                      setExpandedSource(null);
                                      setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }, 100);
                                    }}
                                    className="bg-[#0B666B] text-white px-6 py-2 rounded-lg hover:bg-[#09555a] transition-colors"
                                  >
                                    Close {expandedSourceInRow.name}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>,
                    );
                  }

                  return rows;
                })()}
              </div>
            ) : (
              <div className="py-8">
                <p className="text-gray-500 text-center">
                  No sources available in this category yet.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Select a category to view sources</p>
          </div>
        )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
