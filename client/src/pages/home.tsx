import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import CategoryCard from "@/components/CategoryCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DOMPurify from "dompurify";

import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Users,
  Heart,
  Award,
  Shield,
  UserCheck,
  CheckCircle,
  Clock,
  Building,
  Building2,
  Home,
  Landmark,
  Scale,
  Activity,
  DollarSign,
  Plus,
  Search,
  Compass,
  MessageCircle,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flag,
  ArrowRight,
  ArrowRightFromLine,
  CornerDownRight,
  TrendingUp,
  Star,
} from "lucide-react";

import PostCard from "@/components/PostCard";
import NewPostModal from "@/components/NewPostModal";
import DynamicDiscussionTopicsSidebar from "@/components/DynamicDiscussionTopicsSidebar";
import { getCategoryIcon } from "@/lib/categories";
import MainLayout from "@/components/MainLayout";

// Import category images
import governmentImg from "@assets/Government.jpg";
import careAtHomeImg from "@assets/care_at_home.jpg";
import healthCareImg from "@assets/health_care.jpg";
import seniorLivingImg from "@assets/new_senior_living_image.png";
import professionalsImg from "@assets/professionals.jpg";
import payingForCareImg from "@assets/paying_for_care.jpg";

// Map category slugs to images
const categoryImages: Record<string, string> = {
  "government-resources": governmentImg,
  "home-care": careAtHomeImg,
  "hospital-rehab": healthCareImg,
  "family-finances": payingForCareImg,
  professionals: professionalsImg,
  "senior-living": seniorLivingImg,
  "paying-for-care": payingForCareImg,
};

interface Category {
  id: string | number;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  postCount?: number;
  color?: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  helpfulVotes: number;
  commentCount: number;
  isResolved: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    city?: string;
    state?: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
    color: string;
  };
  expertVerification?: {
    id: number;
    userId: string;
    profession: string;
    credentials?: string;
    verificationStatus: string;
    verifiedAt?: string;
    createdAt?: string;
    expertiseArea?: string;
    professionalTitle?: string;
    company?: string;
    website?: string;
    linkedinUrl?: string;
    profileImageUrl?: string;
    bio?: string;
    yearsExperience?: number;
    licenseNumber?: string;
    verifiedBy?: string;
    featuredExpert: boolean;
    updatedAt?: string;
    blogUrl?: string;
    booksUrl?: string;
    articlesUrl?: string;
    companyAddress?: string;
    companyWebsite?: string;
    companyEmail?: string;
    licenseFileUrl?: string;
    stripePaymentIntentId?: string;
    verificationFeeStatus?: string;
    verificationFeePaidAt?: string;
    consultationRate?: number;
    consultationEnabled?: boolean;
    availabilitySchedule?: string;
  };
}

export default function HomePage() {
  const [showSignup, setShowSignup] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [sortBy, setSortBy] = useState<"hot" | "new" | "top">("top");
  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [expandedSocialTab, setExpandedSocialTab] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("HomePage rendered with selectedCategory:", selectedCategory);
    console.log("HomePage rendered with expandedSocialTab:", expandedSocialTab);
  }, [selectedCategory, expandedSocialTab]);

  // Fetch categories and posts
  const { data: fetchedCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: recentPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts", sortBy, selectedCategory?.id],
    queryFn: async () => {
      let url = `/api/posts?sortBy=${sortBy}`;
      if (selectedCategory) {
        url += `&categoryId=${selectedCategory.id}`;
      }
      console.log("Fetching posts with URL:", url);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      console.log("Received posts:", data.length);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !searchQuery,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<Post[]>({
    queryKey: ["/api/posts/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const response = await fetch(`/api/posts/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Failed to search posts");
      return response.json();
    },
    enabled: !!searchQuery,
    staleTime: 1 * 60 * 1000,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
  };

  const handleClearSearch = () => {
    setSearchQuery(null);
  };

  const postsToDisplay = searchQuery ? searchResults : recentPosts;

  // Fetch actual categories from database
  const { data: dbCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories/level/0"],
    retry: false,
  });

  // Fetch social media embeds based on expanded tab
  const { data: socialMediaEmbeds = [] } = useQuery({
    queryKey: ["/api/social-media-embeds", expandedSocialTab],
    enabled: !!expandedSocialTab,
    queryFn: async () => {
      const response = await fetch(
        `/api/social-media-embeds/${expandedSocialTab}`,
      );
      if (!response.ok) throw new Error("Failed to fetch social media embeds");
      return response.json();
    },
  });

  // Map database categories to display format with appropriate icons
  const getIconForCategory = (slug: string) => {
    switch (slug) {
      case "government-resources":
        return Landmark;
      case "home-care":
        return Home;
      case "hospital-rehab":
        return Activity;
      case "health-conditions":
        return Heart;
      case "family-finances":
        return DollarSign;
      case "professionals":
        return UserCheck;
      case "senior-living":
        return Building;
      case "paying-for-senior-living":
        return DollarSign;
      case "retirement-living-wellness":
        return Heart;
      case "authors-bloggers-podcasters":
        return MessageSquare;
      case "books-retirement-directories":
        return Building2;
      case "helpful-associations":
        return Users;
      default:
        return Compass;
    }
  };

  const getColorForCategory = (slug: string) => {
    switch (slug) {
      case "government-resources":
        return "bg-blue-500";
      case "home-care":
        return "bg-emerald-400";
      case "hospital-rehab":
        return "bg-pink-400";
      case "health-conditions":
        return "bg-red-400";
      case "family-finances":
        return "bg-green-400";
      case "professionals":
        return "bg-blue-400";
      case "senior-living":
        return "bg-orange-400";
      case "paying-for-senior-living":
        return "bg-green-500";
      case "retirement-living-wellness":
        return "bg-purple-400";
      case "authors-bloggers-podcasters":
        return "bg-yellow-400";
      case "books-retirement-directories":
        return "bg-indigo-400";
      case "helpful-associations":
        return "bg-teal-400";
      default:
        return "bg-gray-400";
    }
  };

  // Transform database categories for display (show first 6)
  const categories = (dbCategories as any[])?.slice(0, 6).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    icon: getIconForCategory(cat.slug),
    color: getColorForCategory(cat.slug),
    postCount: cat.postCount || 0,
  }));

  return (
    <MainLayout showSidebar={false} sortBy={sortBy} onSortChange={setSortBy} onSearch={handleSearch}>
      <div className="grid lg:grid-cols-12 gap-16">
        {/* Dynamic Topics Sidebar - 25% width (3/12) */}
        <div className="lg:col-span-3">
          <DynamicDiscussionTopicsSidebar
            onCategoryClick={(id, name) => {
              console.log("Category clicked:", id, name);
              setSelectedCategory({ id, name });
            }}
            selectedCategoryId={selectedCategory?.id}
          />

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">💡 Quick Tips</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <Heart className="w-4 h-4 mt-0.5 text-pink-500 flex-shrink-0" />
                <span>Use clear, descriptive titles for better responses</span>
              </div>
              <div className="flex items-start space-x-2">
                <Users className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                <span>
                  Share your location (state/region) for local resources
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 mt-0.5 text-teal-500 flex-shrink-0" />
                <span>Remember to protect personal information</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 55% width (7/12) */}
        <div className="lg:col-span-7">
          {/* Recent Discussions */}
          <div className="mb-24">
            <div className="mb-6 ml-3">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  {searchQuery ? (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Search Results for</h3>
                        <div className="text-sm font-normal text-gray-700">{searchQuery}</div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleClearSearch}
                        className="h-8 px-3 text-sm font-medium"
                        data-testid="clear-search-button"
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedCategory ? (
                        `${selectedCategory.name} Discussions`
                      ) : (
                        `${sortBy === "top" ? "Top" : sortBy === "new" ? "Recent" : "Hot"} Discussions`
                      )}
                    </h3>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      console.log("Today's News button clicked");
                      setExpandedSocialTab(
                        expandedSocialTab === "todaysnews"
                          ? null
                          : "todaysnews",
                      );
                    }}
                    size="default"
                    className="bg-[#0B666B] hover:bg-[#0B666B]/90 text-white border border-black"
                  >
                    Today's News
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("LinkedIn button clicked");
                      setExpandedSocialTab(
                        expandedSocialTab === "linkedin" ? null : "linkedin",
                      );
                    }}
                    size="default"
                    className="bg-[#0B666B] hover:bg-[#0B666B]/90 text-white border border-black"
                  >
                    LinkedIn
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("X Posts button clicked");
                      setExpandedSocialTab(
                        expandedSocialTab === "xposts" ? null : "xposts",
                      );
                    }}
                    size="default"
                    className="bg-[#0B666B] hover:bg-[#0B666B]/90 text-white border border-black"
                  >
                    X Posts
                  </Button>
                </div>
              </div>

              {selectedCategory && (
                <div className="mb-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Show All Discussions
                  </button>
                </div>
              )}
            </div>

            {/* Social Media Accordion */}
            {expandedSocialTab && (
              <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {expandedSocialTab === "todaysnews" && "Today's News"}
                    {expandedSocialTab === "linkedin" && "LinkedIn Posts"}
                    {expandedSocialTab === "xposts" && "X Posts"}
                  </h3>
                  <button
                    onClick={() => setExpandedSocialTab(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                    {socialMediaEmbeds.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6">
                        {socialMediaEmbeds.map((embed: any) => (
                          <div key={embed.id} className="space-y-2">
                            <h4 className="font-medium text-gray-700 mb-3">
                              {embed.name}
                            </h4>
                            {embed.embedCode ? (
                              <div
                                className="w-full iframe-container"
                                style={{
                                  position: "relative",
                                  width: "100%"
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(embed.embedCode, {
                                    ALLOWED_TAGS: [
                                      "iframe",
                                      "div",
                                      "script",
                                      "a",
                                      "img",
                                      "p",
                                      "span",
                                      "h1",
                                      "h2",
                                      "h3",
                                      "h4",
                                      "h5",
                                      "h6",
                                    ],
                                    ALLOWED_ATTR: [
                                      "src",
                                      "href",
                                      "width",
                                      "height",
                                      "frameborder",
                                      "allowfullscreen",
                                      "style",
                                      "class",
                                      "id",
                                      "target",
                                      "rel",
                                      "alt",
                                    ],
                                    ADD_TAGS: ["script"],
                                    ADD_ATTR: [
                                      "allow",
                                      "allowfullscreen",
                                      "frameborder",
                                      "scrolling",
                                    ],
                                  }),
                                }}
                              />
                            ) : (
                              <div className="text-gray-400 text-sm italic">
                                No embed code added yet
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-500 mb-4">
                            No embed content available yet.
                          </p>
                          <p className="text-sm text-gray-400">
                            Admin can add test RSS.app embed code here
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {isSearching ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Searching...</p>
                </div>
              ) : searchQuery && (!postsToDisplay || postsToDisplay.length === 0) ? (
                <div className="text-center py-12" data-testid="no-results-message">
                  <p className="text-gray-500 text-lg mb-2">No results found for "{searchQuery}"</p>
                  <p className="text-gray-400 text-sm">Try different keywords or browse all discussions</p>
                </div>
              ) : Array.isArray(postsToDisplay) && postsToDisplay.length > 0 ? (
                postsToDisplay.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No discussions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Categories Section - Hidden for now */}
          {false && (
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Find Support in Your Area of Need
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Connect with caregivers facing similar challenges. Our
                  community is organized by care areas to help you find the most
                  relevant support and advice.
                </p>
              </div>

              {Array.isArray(dbCategories) && dbCategories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {(dbCategories as any[]).slice(0, 6).map((category: any) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      categoryImage={categoryImages[category.slug]}
                      onJoinClick={() => setShowNewPostModal(true)}
                      onExploreClick={() =>
                        (window.location.href = `/category/${category.slug}`)
                      }
                      compact={true}
                    />
                  ))}
                </div>
              )}

              {/* And Much More Button */}
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  className="px-8 py-3 text-lg font-semibold border-askEdithTeal text-askEdithTeal hover:bg-askEdithTeal hover:text-white"
                  onClick={() => setShowNewPostModal(true)}
                >
                  And Much More
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - 20% width (2/12) for Advertisers */}
        <div className="lg:col-span-2">
          <div
            className="bg-gray-50 rounded-xl border border-white shadow-sm p-4"
            style={{ minHeight: "1176px" }}
          >
            <div className="text-center text-gray-500 text-xs mb-4">Ads</div>
            {/* Future advertiser content will go here */}
          </div>
        </div>
      </div>

      {/* Bottom Hero Section - Hidden for now */}
      {false && (
        <section className="py-20" style={{ backgroundColor: "#487d7a" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                You're Not Alone in This Journey
              </h2>
              <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                Join thousands of family caregivers who share resources, advice,
                and support every day.
              </p>
              <div className="flex justify-center space-x-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">8,000+</div>
                  <div className="text-white">Active Members</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">25,000+</div>
                  <div className="text-white">Questions Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">50+</div>
                  <div className="text-white">Expert Contributors</div>
                </div>
              </div>
              <div className="space-y-3 text-white max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Get answers from experienced caregivers</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Access vetted resources and expert advice</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Connect with others in your area</span>
                </div>
              </div>
            </div>
            <div className="space-x-4">
              <Button
                size="lg"
                className="bg-white text-teal-700 hover:bg-gray-100 px-8"
                onClick={() => setShowNewPostModal(true)}
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Ask Your First Question
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-teal-700 px-8"
                onClick={() => setShowSignup(true)}
              >
                Join Our Community
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* New Post Modal */}
      {showNewPostModal && (
        <NewPostModal
          open={showNewPostModal}
          onClose={() => setShowNewPostModal(false)}
          mode="post"
        />
      )}

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <NewPostModal
          open={showNewTopicModal}
          onClose={() => setShowNewTopicModal(false)}
          mode="topic"
        />
      )}
    </MainLayout>
  );
}
