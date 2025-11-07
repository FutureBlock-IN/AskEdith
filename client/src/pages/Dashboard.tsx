import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Award,
  BookOpen,
  Clock,
  MapPin,
  Calendar,
  Users,
  MessageSquare,
  Star,
  CheckCircle,
  Phone,
  AlertCircle,
  Coffee,
  Sunrise,
  Moon,
  Activity,
  Target,
  Bookmark,
  TrendingUp,
  User,
  Shield,
  Smile,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/MainLayout";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Daily wellness tips specifically for caregivers
  const wellnessTips = [
    {
      icon: Coffee,
      title: "Morning Self-Care",
      content: "Take 5 minutes each morning for yourself before starting caregiving tasks. Deep breathing or a warm cup of tea can set a positive tone for your day.",
      category: "Mindfulness"
    },
    {
      icon: Phone,
      title: "Stay Connected",
      content: "Call a friend or family member today. Social connection is crucial for caregiver mental health and reduces feelings of isolation.",
      category: "Social Support"
    },
    {
      icon: Activity,
      title: "Movement Break",
      content: "Take a 10-minute walk or do gentle stretches. Physical activity helps reduce caregiver stress and improves your energy levels.",
      category: "Physical Health"
    },
    {
      icon: Moon,
      title: "Evening Routine",
      content: "Create a calming bedtime routine. Good sleep is essential for caregivers to maintain patience and emotional resilience.",
      category: "Rest"
    },
    {
      icon: Heart,
      title: "Practice Gratitude",
      content: "Write down three things you're grateful for today. This simple practice can improve mood and reduce caregiver burnout.",
      category: "Mental Health"
    }
  ];

  const currentTip = wellnessTips[currentTipIndex];

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % wellnessTips.length);
  };

  const previousTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + wellnessTips.length) % wellnessTips.length);
  };

  // Fetch real user dashboard statistics
  const { data: userStats = {
    postsCreated: 0,
    helpfulVotes: 0,
    commentsPosted: 0,
    daysActive: 0
  }, isLoading: statsLoading } = useQuery<{
    postsCreated: number;
    helpfulVotes: number;
    commentsPosted: number;
    daysActive: number;
  }>({
    queryKey: ["/api/user/dashboard-stats"],
    enabled: !!user, // Only fetch if user is logged in
  });

  // Keep other mock data for features not yet implemented
  const additionalStats = {
    achievementsEarned: 5,
    bookmarkedPosts: 8
  };

  // Recent achievements
  const achievements = [
    { name: "Helpful Community Member", description: "Received 25+ helpful votes", icon: Heart, earned: true },
    { name: "Active Contributor", description: "Posted 10+ discussions", icon: MessageSquare, earned: true },
    { name: "Supportive Friend", description: "Helped 5+ caregivers", icon: Users, earned: true },
    { name: "Knowledge Seeker", description: "Bookmarked 10+ posts", icon: BookOpen, earned: false },
    { name: "Community Builder", description: "Active for 60+ days", icon: Award, earned: false }
  ];

  // Local resources - would be personalized based on user location
  const localResources = [
    {
      name: "Elder Care Support Group",
      type: "Support Group",
      location: "Community Center",
      nextMeeting: "Thursday 7:00 PM",
      distance: "2.3 miles"
    },
    {
      name: "Caregiver Respite Services",
      type: "Respite Care",
      location: "Lutheran Family Services",
      nextMeeting: "Call for availability",
      distance: "4.1 miles"
    },
    {
      name: "Medicare Workshop",
      type: "Educational Event",
      location: "Public Library",
      nextMeeting: "Next Tuesday 2:00 PM",
      distance: "1.8 miles"
    }
  ];

  // Emergency contacts template
  const emergencyContacts = [
    { label: "Primary Care Doctor", placeholder: "Dr. Smith - (555) 123-4567" },
    { label: "Emergency Contact", placeholder: "Family member - (555) 987-6543" },
    { label: "Pharmacy", placeholder: "CVS Pharmacy - (555) 456-7890" },
    { label: "Insurance", placeholder: "Blue Cross - (800) 555-0123" }
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div>
        {/* Welcome Section */}
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.firstName || 'Sarah'}
          </h1>
          <p className="text-gray-600">
            Your personalized dashboard for support, wellness, and community connection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Wellness Tip */}
            <Card className="border-l-4 border-l-askEdithTeal">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <currentTip.icon className="w-5 h-5 text-askEdithTeal" />
                    Daily Wellness Tip
                  </CardTitle>
                  <Badge variant="secondary">{currentTip.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-gray-800 mb-2">{currentTip.title}</h3>
                <p className="text-gray-600 mb-4">{currentTip.content}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={previousTip}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextTip}>
                      Next Tip
                    </Button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {currentTipIndex + 1} of {wellnessTips.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Your Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Smile className="w-5 h-5 text-askEdithTeal" />
                  Your Community Impact
                </CardTitle>
                <CardDescription>
                  See how you're making a difference in the caregiver community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <div className="text-2xl font-bold text-amber-600">
                      {statsLoading ? "..." : userStats.postsCreated}
                    </div>
                    <div className="text-sm text-gray-600">Posts Created</div>
                  </div>
                  <div className="text-center bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <div className="text-2xl font-bold text-orange-600">
                      {statsLoading ? "..." : userStats.helpfulVotes}
                    </div>
                    <div className="text-sm text-gray-600">Helpful Votes</div>
                  </div>
                  <div className="text-center bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <div className="text-2xl font-bold text-amber-600">
                      {statsLoading ? "..." : userStats.commentsPosted}
                    </div>
                    <div className="text-sm text-gray-600">Comments</div>
                  </div>
                  <div className="text-center bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <div className="text-2xl font-bold text-orange-600">
                      {statsLoading ? "..." : userStats.daysActive}
                    </div>
                    <div className="text-sm text-gray-600">Days Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Award className="w-5 h-5 text-askEdithTeal" />
                  Your Achievements
                </CardTitle>
                <CardDescription>
                  Recognition for your contributions to the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.map((achievement, index) => (
                    <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${achievement.earned ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <achievement.icon className={`w-6 h-6 ${achievement.earned ? 'text-teal-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <div className={`font-medium ${achievement.earned ? 'text-gray-800' : 'text-gray-500'}`}>
                          {achievement.name}
                        </div>
                        <div className={`text-sm ${achievement.earned ? 'text-gray-600' : 'text-gray-400'}`}>
                          {achievement.description}
                        </div>
                      </div>
                      {achievement.earned && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Target className="w-5 h-5 text-teal-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/ask-question">
                  <Button className="w-full bg-teal-25 hover:bg-teal-50 text-gray-700 border-teal-100" variant="outline" style={{ backgroundColor: '#f0fdfa' }}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Ask a Question
                  </Button>
                </Link>
                <Link href="/expert-directory">
                  <Button className="w-full bg-cyan-25 hover:bg-cyan-50 text-gray-700 border-cyan-100" variant="outline" style={{ backgroundColor: '#ecfeff' }}>
                    <Users className="w-4 h-4 mr-2" />
                    Find Experts
                  </Button>
                </Link>
                <Link href="/my-bookings">
                  <Button className="w-full bg-teal-50 hover:bg-teal-100 text-gray-700 border-teal-100" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    My Bookings
                  </Button>
                </Link>
                <Link href="/bookmarks">
                  <Button className="w-full bg-teal-25 hover:bg-teal-50 text-gray-700 border-teal-100" variant="outline" style={{ backgroundColor: '#f0fdfa' }}>
                    <Bookmark className="w-4 h-4 mr-2" />
                    My Bookmarks ({additionalStats.bookmarkedPosts})
                  </Button>
                </Link>
                {user?.expertVerification?.verificationStatus === 'verified' && (
                  <>
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">Expert Tools</p>
                    </div>
                    <Link href="/expert/availability">
                      <Button className="w-full bg-amber-50 hover:bg-amber-100 text-gray-700 border-amber-200" variant="outline">
                        <Clock className="w-4 h-4 mr-2" />
                        Manage Availability
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Local Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-5 h-5 text-askEdithTeal" />
                  Local Resources
                </CardTitle>
                <CardDescription>
                  Support services in your area
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {localResources.map((resource, index) => (
                  <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                    <div className="font-medium text-gray-800">{resource.name}</div>
                    <div className="text-sm text-amber-700 font-medium">{resource.type}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {resource.nextMeeting} • {resource.distance}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View All Resources
                </Button>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Shield className="w-5 h-5 text-askEdithTeal" />
                  Emergency Contacts
                </CardTitle>
                <CardDescription>
                  Keep important numbers handy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      {contact.label}
                    </label>
                    <input
                      type="text"
                      placeholder={contact.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-askEdithTeal focus:border-transparent"
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Save Contacts
                </Button>
              </CardContent>
            </Card>

            {/* Caregiver Burnout Warning */}
            <Card className="border-l-4 border-l-orange-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="w-5 h-5" />
                  Burnout Check
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Remember: Taking care of yourself isn't selfish—it's necessary.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>I've taken breaks today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span>I feel overwhelmed lately</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Take Burnout Assessment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}