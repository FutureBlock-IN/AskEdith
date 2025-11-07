import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  ChevronDown,
  ChevronRight,
  Heart,
  Users,
  Shield,
  Plus,
} from "lucide-react";

interface Topic {
  name: string;
  count: number;
  color: string;
  subtopics: string[];
}

interface TopicGroup {
  groupName: string;
  topics: Topic[];
}

interface Forum {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

interface CategoryHierarchyItem {
  id: number;
  name: string;
  postCount: number;
  children?: CategoryHierarchyItem[];
}

export default function DiscussionTopicsSidebar() {
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Fetch dynamic data from database
  const { data: discussionForums = [] } = useQuery<Forum[]>({
    queryKey: ['/api/categories/level/0'],
    retry: false,
  });

  const { data: categoryHierarchy = [] } = useQuery<CategoryHierarchyItem[]>({
    queryKey: ['/api/categories/hierarchy'],
    retry: false,
  });

  const toggleTopic = (topicName: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicName]: !prev[topicName]
    }));
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Build topic groups from database data
  const topicGroups: TopicGroup[] = discussionForums.map((forum: Forum) => {
    const forumData = categoryHierarchy.find((item: CategoryHierarchyItem) => item.id === forum.id);
    const mainTopics = forumData?.children || [];
    
    return {
      groupName: forum.name,
      topics: mainTopics.map((mainTopic: CategoryHierarchyItem) => ({
        name: mainTopic.name,
        count: mainTopic.postCount || 0,
        color: getColorForTopic(mainTopic.name),
        subtopics: (mainTopic.children || []).map((subTopic: CategoryHierarchyItem) => subTopic.name)
      }))
    };
  });

  // Helper function to assign colors based on topic names
  function getColorForTopic(topicName: string): string {
    const colorMap: Record<string, string> = {
      "Federal & State Resources": "bg-teal-100",
      "Veteran Benefits": "bg-red-100", 
      "Medicare": "bg-blue-100",
      "Medicaid": "bg-pink-100",
      "Home Care Services": "bg-emerald-100",
      "ADUs & Home Modifications": "bg-orange-100",
      "Selling a Home": "bg-yellow-100",
      "Senior Living Options": "bg-purple-100",
      "Respite Care": "bg-indigo-100",
      "Hospice Care": "bg-gray-100"
    };
    return colorMap[topicName] || "bg-gray-100";
  }

  // Legacy hardcoded structure (keeping as fallback but shouldn't be used)
  const legacyTopicGroups: TopicGroup[] = [
    {
      groupName: "Government Resources",
      topics: [
        {
          name: "Federal & State Resources",
          count: 98,
          color: "bg-teal-100",
          subtopics: ["Area Agencies on Aging", "Long-Term Care Ombudsman", "Adult Protective Services", "Adult Day Centers", "Meals on Wheels", "Transportation", "Friendship Line", "Suicide Prevention Hotline", "Tax Filing Help"]
        },
        {
          name: "Veteran Benefits",
          count: 45,
          color: "bg-red-100",
          subtopics: ["VA Healthcare", "Disability Benefits", "Military Discounts", "Veteran Services", "GI Bill Benefits"]
        },
        {
          name: "Medicare",
          count: 189,
          color: "bg-blue-100",
          subtopics: ["Medicare Part A & B", "Medicare Part C", "Medicare Part D"]
        },
        {
          name: "Medicaid",
          count: 112,
          color: "bg-pink-100",
          subtopics: ["Qualifying for Medicaid", "Lookback Periods", "State Claims", "Filing Assistance"]
        }
      ]
    },
    {
      groupName: "Home & Care Services",
      topics: [
        {
          name: "Home Care",
          count: 156,
          color: "bg-emerald-100",
          subtopics: ["Recommended Agencies", "Managing Home Care Aides", "Negotiating with Home Care Agencies", "Typical Contract Periods"]
        },
        {
          name: "ADUs & Home Modifications",
          count: 34,
          color: "bg-green-100",
          subtopics: ["Accessibility Modifications", "Safety Features", "ADU Construction", "Home Assessments"]
        },
        {
          name: "Selling a Home",
          count: 28,
          color: "bg-yellow-100",
          subtopics: ["Market Preparation", "Senior-Friendly Realtors", "Moving Assistance", "Estate Sales"]
        },
        {
          name: "Senior Living",
          count: 134,
          color: "bg-orange-100",
          subtopics: ["Senior Apartments", "Active Adult", "Independent Living", "Assisted Living", "Memory Care", "Life Plan Communities", "CCRCs"]
        },
        {
          name: "Respite Care",
          count: 42,
          color: "bg-indigo-100",
          subtopics: ["Adult Day Programs", "Overnight Respite", "Family Relief", "Caregiver Support"]
        },
        {
          name: "Hospice",
          count: 38,
          color: "bg-purple-100",
          subtopics: ["End-of-Life Planning", "Comfort Care", "Family Support", "Grief Resources"]
        }
      ]
    },
    {
      groupName: "Financial Planning",
      topics: [
        {
          name: "Paying for Senior Living",
          count: 89,
          color: "bg-purple-100",
          subtopics: ["Cost Planning", "Financial Assessment", "Payment Options", "Veterans Benefits"]
        },
        {
          name: "Long-Term Care Insurance",
          count: 67,
          color: "bg-blue-100",
          subtopics: ["Understanding Policies", "Claims Assistance", "Elimination Periods in Policies"]
        },
        {
          name: "Life Settlements",
          count: 23,
          color: "bg-amber-100",
          subtopics: ["Policy Evaluation", "Settlement Process", "Tax Implications", "Buyer Selection"]
        }
      ]
    },
    {
      groupName: "Professionals",
      topics: [
        {
          name: "Elder Law Attorneys",
          count: 76,
          color: "bg-amber-100",
          subtopics: ["Power of Attorney", "Trust & Estates", "Family Fights", "Guardianship"]
        },
        {
          name: "Aging Life Care Professionals",
          count: 52,
          color: "bg-cyan-100",
          subtopics: ["Care Management", "Assessment Services", "Resource Coordination", "Family Support"]
        },
        {
          name: "Senior Living Finders",
          count: 34,
          color: "bg-emerald-100",
          subtopics: ["Community Research", "Placement Services", "Tour Coordination", "Contract Negotiation"]
        },
        {
          name: "Other Care Professionals",
          count: 89,
          color: "bg-blue-100",
          subtopics: ["Geriatricians", "Social Workers", "Therapists", "Care Coordinators"]
        }
      ]
    },
    {
      groupName: "Health Conditions",
      topics: [
        {
          name: "Alzheimer's & Dementia",
          count: 203,
          color: "bg-purple-100",
          subtopics: ["Early Signs & Diagnosis", "Memory Care Options", "Behavioral Management", "Family Support", "Legal Planning", "Safety Modifications"]
        },
        {
          name: "Parkinsons",
          count: 87,
          color: "bg-red-100",
          subtopics: ["Movement Disorders", "Medication Management", "Physical Therapy", "Support Groups"]
        },
        {
          name: "Strokes & Heart Issues",
          count: 94,
          color: "bg-pink-100",
          subtopics: ["Recovery Planning", "Rehabilitation", "Lifestyle Changes", "Prevention"]
        },
        {
          name: "Other Diseases",
          count: 156,
          color: "bg-gray-100",
          subtopics: ["Diabetes Management", "Arthritis Care", "Chronic Conditions", "Pain Management"]
        }
      ]
    }
  ];

  // Initialize all groups as open by default
  useEffect(() => {
    const initialGroupState: Record<string, boolean> = {};
    topicGroups.forEach(group => {
      initialGroupState[group.groupName] = true;
    });
    setExpandedGroups(initialGroupState);
  }, []);

  return (
    <div className="sticky top-8">
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="p-4 mb-4 bg-[#0B666B]/90">
          <h3 className="text-lg font-semibold text-white mb-0 flex items-center">
            <Compass className="w-5 h-5 mr-2 text-white" />
            Discussion Forums
          </h3>
        </div>
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {topicGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                {/* Group Header */}
                <div 
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 bg-green-50 px-3 py-2 rounded-lg border-l-4 border-green-200 cursor-pointer hover:bg-green-100 transition-colors flex items-center justify-between"
                  onClick={() => toggleGroup(group.groupName)}
                >
                  <span>{group.groupName}</span>
                  {expandedGroups[group.groupName] ? 
                    <ChevronDown className="w-4 h-4 text-gray-500" /> :
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  }
                </div>
                
                {/* Topics in this group */}
                {expandedGroups[group.groupName] && group.topics.map((topic, topicIndex) => (
                  <div key={topicIndex} className="border-b border-gray-100 last:border-b-0">
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleTopic(topic.name)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${topic.color}`}></div>
                        <span className="text-sm text-gray-700">{topic.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-gray-500">{topic.count}</span>
                        {topic.subtopics.length > 0 && (
                          expandedTopics[topic.name] ? 
                            <ChevronDown className="w-4 h-4 text-gray-400" /> :
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedTopics[topic.name] && topic.subtopics.length > 0 && (
                      <div className="ml-6 pb-3 space-y-1">
                        {topic.subtopics.map((subtopic, subIndex) => (
                          <div key={subIndex} className="flex items-center p-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                            <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                            {subtopic}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Visual buffer between groups (except last group) */}
                {groupIndex < topicGroups.length - 1 && (
                  <div className="h-4"></div>
                )}
              </div>
            ))}
            
            {/* Create Your Own Forum Button */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                className="w-full flex items-center justify-center py-3 px-4 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors duration-150 group"
                onClick={() => {
                  // TODO: Add modal or navigation to create forum functionality
                  console.log('Create Your Own Forum clicked');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your Own Forum
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-3">💡 Quick Tips</h4>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <Heart className="w-4 h-4 mt-0.5 text-pink-500 flex-shrink-0" />
            <span>Use clear, descriptive titles for better responses</span>
          </div>
          <div className="flex items-start space-x-2">
            <Users className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
            <span>Share your location (state/region) for local resources</span>
          </div>
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 mt-0.5 text-teal-500 flex-shrink-0" />
            <span>Remember to protect personal information</span>
          </div>
        </div>
      </div>
    </div>
  );
}