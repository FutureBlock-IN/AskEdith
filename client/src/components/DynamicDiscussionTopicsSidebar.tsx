import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { CreateForumModal } from "./CreateForumModal";
import {
  Compass,
  ChevronDown,
  ChevronRight,
  Heart,
  Users,
  Shield,
  Plus,
} from "lucide-react";

interface Discussion {
  id: number;
  name: string;
  count: number;
  color: string;
  topics: Array<{
    id: number;
    name: string;
    count: number;
  }>;
}

interface Forum {
  id: number;
  forumName: string;
  forumPostCount: number;
  discussions: Discussion[];
  orderIndex?: number;
}

interface DynamicDiscussionTopicsSidebarProps {
  onCategoryClick?: (categoryId: number, categoryName: string) => void;
  selectedCategoryId?: number;
}

export default function DynamicDiscussionTopicsSidebar({
  onCategoryClick,
  selectedCategoryId,
}: DynamicDiscussionTopicsSidebarProps = {}) {
  // Debug log to verify prop is being passed
  console.log(
    "DynamicDiscussionTopicsSidebar rendered with onCategoryClick:",
    !!onCategoryClick,
  );
  const [expandedDiscussions, setExpandedDiscussions] = useState<
    Record<string, boolean>
  >({});
  const [expandedForums, setExpandedForums] = useState<Record<string, boolean>>(
    {},
  );
  const [showCreateForumModal, setShowCreateForumModal] = useState(false);
  const [showRetirementSeeMore, setShowRetirementSeeMore] = useState(false);
  const [showCaregivingSeeMore, setShowCaregivingSeeMore] = useState(false);

  // Fetch dynamic data from database
  const { data: discussionForums = [] } = useQuery({
    queryKey: ["/api/categories/level/0"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: categoryHierarchy = [] } = useQuery({
    queryKey: ["/api/categories/hierarchy"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const toggleDiscussion = (discussionName: string) => {
    setExpandedDiscussions((prev) => ({
      ...prev,
      [discussionName]: !prev[discussionName],
    }));
  };

  const toggleForum = (forumName: string) => {
    setExpandedForums((prev) => ({
      ...prev,
      [forumName]: !prev[forumName],
    }));
  };

  const handleCategoryClick = (id: number, name: string) => {
    if (onCategoryClick) {
      onCategoryClick(id, name);
    }
  };

  // Helper function to assign colors based on discussion names
  function getColorForDiscussion(discussionName: string): string {
    const colorMap: Record<string, string> = {
      "Federal & State Resources": "bg-teal-100",
      "Veteran Benefits": "bg-red-100",
      Medicare: "bg-blue-100",
      Medicaid: "bg-pink-100",
      "Home Care Services": "bg-emerald-100",
      "ADUs & Home Modifications": "bg-orange-100",
      "Selling a Home": "bg-yellow-100",
      "Senior Living Options": "bg-purple-100",
      "Respite Care": "bg-indigo-100",
      "Hospice Care": "bg-gray-100",
      "Hospitals & Rehab": "bg-cyan-100",
    };
    return colorMap[discussionName] || "bg-gray-100";
  }

  // Build forums from database data
  // Use categoryHierarchy directly since it already has level 0 items with children
  const forums: Forum[] = (categoryHierarchy as any[])
    .filter((forum: any) => forum.level === 0) // Only top-level discussion forums
    .map((forum: any) => {
      const mainDiscussions = forum.children || [];

      const discussions = mainDiscussions.map((discussion: any) => ({
        id: discussion.id,
        name: discussion.name,
        count: parseInt(discussion.postCount) || 0,
        color: getColorForDiscussion(discussion.name),
        topics: (discussion.children || []).map((topic: any) => ({
          id: topic.id,
          name: topic.name,
          count: topic.postCount || 0,
        })),
        orderIndex: discussion.orderIndex || 0, // Add orderIndex
      }));

      // Calculate total posts for this forum
      const totalForumPosts = discussions.reduce(
        (total: number, discussion: any) => total + discussion.count,
        parseInt(forum.postCount) || 0,
      );

      return {
        id: forum.id,
        forumName: forum.name,
        forumPostCount: totalForumPosts,
        discussions,
        orderIndex: forum.orderIndex || 0, // Add orderIndex
      };
    });


  // Initialize all forums as closed by default - only once when forums are first loaded
  useEffect(() => {
    if (forums.length > 0 && Object.keys(expandedForums).length === 0) {
      const initialForumState: Record<string, boolean> = {};
      forums.forEach((forum: any) => {
        initialForumState[forum.forumName] = false;
      });
      setExpandedForums(initialForumState);
    }
  }, [forums, expandedForums]);

  // Define retirement forum names that should appear in the retirement section
  const retirementForumSet = new Set([
    "Advice Between Generations",
    "My Favorite Places to Visit",
    "My Favorite Recipes",
    "Should I Spend or Should I Save?",
    "401Ks, IRAs, & Pensions",
    "Financial Planning for Retirement",
    "Social Security",
    "Wills, Trusts, & Estate Planning",
    "Accessory Dwelling Units",
    "Home Modifications",
    "Buying & Selling a Home",
    "Empty Nest Decisions",
    "Retirement & Senior Living Communities",
    "Career Changes & Semi-Retirement",
    "Entrepreneurship in Retirement",
    "Gig Life",
    "Grandchildren",
    "Family Dynamics",
    "Divorce",
    "Widowhood",
    "General Health",
    "Navigating Medicare",
    "Navigating Medicaid",
    "Solo Life",
    "Travel in Retirement",
    "Taxes and Retirement",
    "Veteran Retirement & Benefits",
  ]);

  // Define where separators should appear (after these forums)
  const separatorAfter = new Set([
    "Social Security", // End of Financial Planning Group
    "Wills, Trusts, & Estate Planning", // After Financial Planning Group
    "Retirement & Senior Living Communities", // After Housing & Life Transitions Group (updated)
    "Gig Life", // After Work & Business Group
    "Widowhood", // After Family Group
    "Navigating Medicaid", // After Health Group
  ]);

  // Separate forums into retirement and caregiving categories
  // Both sections now use order_index for sorting
  const retirementForums = forums
    .filter((forum) => retirementForumSet.has(forum.forumName))
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  const caregivingForums = forums
    .filter((forum) => !retirementForumSet.has(forum.forumName))
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  return (
    <div className="space-y-6">
      {/* All Things Retirement Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#1e3a5f]/90">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white">All Things Retirement</h3>
          </div>
          <p className="text-sm text-white/100 mt-1">
            Members Sharing Knowledge. For a stronger retirement.
          </p>
        </div>

        <div className="p-4">
          <div className="space-y-1">
            {/* First, A Little Fun Header */}
            <div className="py-2.5 px-3">
              <span className="text-sm font-bold" style={{ color: "#1e3a5f" }}>
                First, A Little Fun!
              </span>
            </div>

            {/* Render the fun forums */}
            {retirementForums
              .filter((forum) =>
                [
                  "Advice Between Generations",
                  "My Favorite Places to Visit",
                  "My Favorite Recipes",
                  "Should I Spend or Should I Save?",
                ].includes(forum.forumName),
              )
              .map((forum, index) => (
                <div key={forum.forumName}>
                  <button
                    onClick={() => {
                      console.log(
                        "Forum clicked:",
                        forum.forumName,
                        "ID:",
                        forum.id,
                      );
                      toggleForum(forum.forumName);
                      if (onCategoryClick) {
                        console.log(
                          "Calling onCategoryClick with:",
                          forum.id,
                          forum.forumName,
                        );
                        onCategoryClick(forum.id, forum.forumName);
                      } else {
                        console.log("onCategoryClick is not defined");
                      }
                    }}
                    className="w-full flex items-center justify-between py-2.5 px-3 transition-colors duration-150 group"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#fffef8")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <span
                      className="text-sm font-medium text-left"
                      style={{ color: "#1e3a5f" }}
                    >
                      {forum.forumName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 font-medium">
                        {forum.forumPostCount}
                      </span>
                      {expandedForums[forum.forumName] ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedForums[forum.forumName] && (
                    <div className="ml-3">
                      {forum.discussions.map((discussion, discussionIndex) => (
                        <div key={discussion.name}>
                          <button
                            onClick={() => {
                              toggleDiscussion(discussion.name);
                              if (onCategoryClick && discussion.id) {
                                onCategoryClick(discussion.id, discussion.name);
                              }
                            }}
                            className="w-full flex items-center justify-between py-2 px-3 transition-colors duration-150 group"
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#fffef8")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "transparent")
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                {discussion.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {discussion.count}
                              </span>
                              {discussion.topics.length > 0 && expandedDiscussions[discussion.name] ? (
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {expandedDiscussions[discussion.name] &&
                            discussion.topics.length > 0 && (
                              <div className="ml-4">
                                {discussion.topics.map((topic, topicIndex) => (
                                  <div key={topic.name}>
                                    <div
                                      className="relative text-xs text-gray-600 hover:text-gray-800 cursor-pointer py-1.5 transition-colors duration-150"
                                      onClick={() => {
                                        if (onCategoryClick && topic.id) {
                                          onCategoryClick(topic.id, topic.name);
                                        }
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          "#fffef8")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          "transparent")
                                      }
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr auto",
                                        gap: "8px",
                                        alignItems: "start",
                                      }}
                                    >
                                      <span
                                        className="leading-tight"
                                        style={{
                                          wordWrap: "break-word",
                                          textAlign: "left",
                                        }}
                                      >
                                        {topic.name}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {topic.count}
                                      </span>
                                    </div>
                                    {topicIndex <
                                      discussion.topics.length - 1 && (
                                      <div
                                        className="border-b border-gray-100 ml-3 mr-3"
                                        style={{ borderBottomWidth: "0.5px" }}
                                      ></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          {discussionIndex < forum.discussions.length - 1 && (
                            <div
                              className="border-b border-gray-100 ml-3 mr-3"
                              style={{ borderBottomWidth: "0.5px" }}
                            ></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add separator after specific forums */}
                  {separatorAfter.has(forum.forumName) && (
                    <div className="py-2">
                      <div
                        className="border-t border-gray-300"
                        style={{ borderWidth: "0.5px" }}
                      ></div>
                    </div>
                  )}
                  {/* Custom divider after "Should I Spend or Should I Save?" */}
                  {forum.forumName === "Should I Spend or Should I Save?" && (
                    <div
                      style={{
                        height: "0.25em",
                        backgroundColor: "#344d6f",
                        marginTop: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    ></div>
                  )}
                </div>
              ))}

            {/* Render remaining retirement forums */}
            {retirementForums
              .filter(
                (forum) =>
                  ![
                    "Advice Between Generations",
                    "My Favorite Places to Visit",
                    "My Favorite Recipes",
                    "Should I Spend or Should I Save?",
                  ].includes(forum.forumName),
              )
              .map((forum, index) => {
                const isFirst401K =
                  forum.forumName === "401Ks, IRAs, & Pensions";
                return (
                  <div key={forum.forumName}>
                    <div>
                      <button
                        onClick={() => toggleForum(forum.forumName)}
                        className={`w-full flex items-center justify-between px-3 transition-colors duration-150 group ${isFirst401K ? "pt-4 pb-2.5" : "py-2.5"}`}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#fffef8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <span
                          className="text-sm font-medium text-left"
                          style={{ color: "#1e3a5f" }}
                        >
                          {forum.forumName}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 font-medium">
                            {forum.forumPostCount}
                          </span>
                          {expandedForums[forum.forumName] ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {expandedForums[forum.forumName] && (
                        <div className="ml-3">
                          {forum.discussions.map(
                            (discussion, discussionIndex) => (
                              <div key={discussion.name}>
                                <button
                                  onClick={() => {
                                    toggleDiscussion(discussion.name);
                                    if (onCategoryClick && discussion.id) {
                                      onCategoryClick(
                                        discussion.id,
                                        discussion.name,
                                      );
                                    }
                                  }}
                                  className="w-full flex items-center justify-between py-2 px-3 transition-colors duration-150 group"
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "#fffef8")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                      {discussion.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      {discussion.count}
                                    </span>
                                    {discussion.topics.length > 0 &&
                                      (expandedDiscussions[discussion.name] ? (
                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      ))}
                                  </div>
                                </button>

                                {expandedDiscussions[discussion.name] &&
                                  discussion.topics.length > 0 && (
                                    <div className="ml-4">
                                      {discussion.topics.map(
                                        (topic, topicIndex) => (
                                          <div key={topic.name}>
                                            <div
                                              className="relative text-xs text-gray-600 hover:text-gray-800 cursor-pointer py-1.5 transition-colors duration-150"
                                              onClick={() => {
                                                if (
                                                  onCategoryClick &&
                                                  topic.id
                                                ) {
                                                  onCategoryClick(
                                                    topic.id,
                                                    topic.name,
                                                  );
                                                }
                                              }}
                                              onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                  "#fffef8")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                  "transparent")
                                              }
                                              style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr auto",
                                                gap: "8px",
                                                alignItems: "start",
                                              }}
                                            >
                                              <span
                                                className="leading-tight"
                                                style={{
                                                  wordWrap: "break-word",
                                                  textAlign: "left",
                                                }}
                                              >
                                                {topic.name}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {topic.count}
                                              </span>
                                            </div>
                                            {topicIndex <
                                              discussion.topics.length - 1 && (
                                              <div
                                                className="border-b border-gray-100 ml-3 mr-3"
                                                style={{
                                                  borderBottomWidth: "0.5px",
                                                }}
                                              ></div>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                {discussionIndex <
                                  forum.discussions.length - 1 && (
                                  <div
                                    className="border-b border-gray-100 ml-3 mr-3"
                                    style={{ borderBottomWidth: "0.5px" }}
                                  ></div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                    {/* Add separator after specific forums */}
                    {separatorAfter.has(forum.forumName) && (
                      <div className="py-2">
                        <div
                          className="border-t border-gray-300"
                          style={{ borderWidth: "0.5px" }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Create Your Own Topic Button */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                className="w-full flex items-center justify-center py-3 px-4 text-sm font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/20 rounded-lg transition-colors duration-150 group"
                onClick={() => setShowCreateForumModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your Own Topic
              </button>

              {/* See More Button */}
              <button
                className="w-full flex items-center justify-center py-3 px-4 mt-2 text-sm font-medium text-gray-700 bg-[#e6845b]/25 hover:bg-[#e6845b]/35 rounded-lg transition-colors duration-150 group"
                onClick={() => setShowRetirementSeeMore(!showRetirementSeeMore)}
              >
                <span className="mr-2">See More</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showRetirementSeeMore ? "rotate-180" : ""}`}
                />
              </button>

              {/* Accordion content for See More */}
              {showRetirementSeeMore && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 text-center">
                    Additional retirement forums will appear here as they are
                    created by the community.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Things Caregiving Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#0B666B]/90">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white">All Things Caregiving</h3>
          </div>
          <p className="text-sm text-white/100 mt-1">
            Support and resources for you as a caregiver
          </p>
        </div>

        <div className="p-4">
          <div className="space-y-1">
            {caregivingForums.map((forum, forumIndex) => (
              <div key={forum.forumName}>
                <button
                  onClick={() => toggleForum(forum.forumName)}
                  className="w-full flex items-center justify-between py-2.5 px-3 transition-colors duration-150 group"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#fffef8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <span
                    className="text-sm font-medium text-left"
                    style={{ color: "#B85C42" }}
                  >
                    {forum.forumName}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 font-medium">
                      {forum.forumPostCount}
                    </span>
                    {expandedForums[forum.forumName] ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedForums[forum.forumName] && (
                  <div className="ml-3">
                    {forum.discussions.map((discussion, discussionIndex) => (
                      <div key={discussion.name}>
                        <button
                          onClick={() => {
                            toggleDiscussion(discussion.name);
                            if (onCategoryClick && discussion.id) {
                              onCategoryClick(discussion.id, discussion.name);
                            }
                          }}
                          className="w-full flex items-center justify-between py-2 px-3 transition-colors duration-150 group"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fffef8")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                              {discussion.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {discussion.count}
                            </span>
                            {discussion.topics.length > 0 &&
                              (expandedDiscussions[discussion.name] ? (
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                              ))}
                          </div>
                        </button>

                        {expandedDiscussions[discussion.name] &&
                          discussion.topics.length > 0 && (
                            <div className="ml-4">
                              {discussion.topics.map((topic, topicIndex) => (
                                <div key={topic.name}>
                                  <div
                                    className="relative text-xs text-gray-600 hover:text-gray-800 cursor-pointer py-1.5 transition-colors duration-150"
                                    onClick={() => {
                                      if (onCategoryClick && topic.id) {
                                        onCategoryClick(topic.id, topic.name);
                                      }
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#fffef8")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                    }
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr auto",
                                      gap: "8px",
                                      alignItems: "start",
                                    }}
                                  >
                                    <span
                                      className="leading-tight"
                                      style={{
                                        wordWrap: "break-word",
                                        textAlign: "left",
                                      }}
                                    >
                                      {topic.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {topic.count}
                                    </span>
                                  </div>
                                  {topicIndex <
                                    discussion.topics.length - 1 && (
                                    <div
                                      className="border-b border-gray-100 ml-3 mr-3"
                                      style={{ borderBottomWidth: "0.5px" }}
                                    ></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        {discussionIndex < forum.discussions.length - 1 && (
                          <div
                            className="border-b border-gray-100 ml-3 mr-3"
                            style={{ borderBottomWidth: "0.5px" }}
                          ></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {forumIndex < caregivingForums.length - 1 &&
                  expandedForums[forum.forumName] && (
                    <div className="border-b border-gray-200 my-3"></div>
                  )}
              </div>
            ))}

            {/* Create Your Own Topic Button */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                className="w-full flex items-center justify-center py-3 px-4 text-sm font-medium text-gray-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors duration-150 group"
                onClick={() => setShowCreateForumModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your Own Topic
              </button>

              {/* See More Button */}
              <button
                className="w-full flex items-center justify-center py-3 px-4 mt-2 text-sm font-medium text-gray-700 bg-[#e6845b]/25 hover:bg-[#e6845b]/35 rounded-lg transition-colors duration-150 group"
                onClick={() => setShowCaregivingSeeMore(!showCaregivingSeeMore)}
              >
                <span className="mr-2">See More</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showCaregivingSeeMore ? "rotate-180" : ""}`}
                />
              </button>

              {/* Accordion content for See More */}
              {showCaregivingSeeMore && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 text-center">
                    Additional caregiving forums will appear here as they are
                    created by the community.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Community Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-gray-900">Community Stats</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active Members</span>
            <span className="font-medium text-gray-900">2,847</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Posts Today</span>
            <span className="font-medium text-gray-900">43</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Helpful Answers</span>
            <span className="font-medium text-gray-900">1,203</span>
          </div>
        </div>
      </div>

      {/* Expert Corner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Expert Corner</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700">DR</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Dr. Sarah Wilson
              </p>
              <p className="text-xs text-gray-500">Geriatrician</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-green-700">LW</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Linda Martinez
              </p>
              <p className="text-xs text-gray-500">Elder Law Attorney</p>
            </div>
          </div>
        </div>
      </div>

      <CreateForumModal
        open={showCreateForumModal}
        onOpenChange={setShowCreateForumModal}
      />
    </div>
  );
}
