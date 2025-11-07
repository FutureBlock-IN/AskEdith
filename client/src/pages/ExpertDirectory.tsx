import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, CheckCircle, Star, Globe, Linkedin, UserPlus, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import SignupModal from "@/components/SignupModal";
import MainLayout from "@/components/MainLayout";

export default function ExpertDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [isProfessionalSignup, setIsProfessionalSignup] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleExpertSignup = () => {
    setIsProfessionalSignup(true);
    setSignupModalOpen(true);
  };

  // Use new all experts endpoint to show all experts regardless of verification status
  const { data: experts, isLoading } = useQuery({
    queryKey: ['/api/experts'],
  });

  const { data: featuredExperts, isLoading: featuredLoading } = useQuery({
    queryKey: ['/api/experts/featured'],
  });

  const filteredExperts = experts?.filter((expert: any) => {
    const matchesSearch = searchTerm === "" || 
      expert.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.expertiseArea?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesExpertise = selectedExpertise === "all" || 
      expert.expertiseArea?.toLowerCase().includes(selectedExpertise.toLowerCase());

    return matchesSearch && matchesExpertise;
  }) || [];

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "EX";
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const expertiseAreas = Array.from(
    new Set(experts?.map((expert: any) => expert.expertiseArea).filter(Boolean))
  );

  if (isLoading || featuredLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Expert Directory</h1>
            <p className="text-gray-600">Connect with verified caregiving professionals and experts</p>
          </div>
          <div className="flex space-x-4">
            {!isAuthenticated && (
              <Button 
                variant="outline" 
                onClick={handleExpertSignup}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Join as Expert
              </Button>
            )}
            {isAuthenticated && (
              <Link href="/expert/apply">
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Apply as Expert
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, profession, or expertise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedExpertise}
                onChange={(e) => setSelectedExpertise(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Expertise Areas</option>
                {expertiseAreas.map((area: string) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Experts ({filteredExperts.length})</TabsTrigger>
            <TabsTrigger value="featured">Featured ({featuredExperts?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {filteredExperts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    {searchTerm || selectedExpertise !== "all" 
                      ? "No experts found matching your criteria"
                      : "No verified experts found"
                    }
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExperts.map((expert: any) => (
                  <ExpertCard key={expert.id} expert={expert} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="featured" className="mt-6">
            {featuredExperts?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">No featured experts at this time</div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredExperts?.map((expert: any) => (
                  <ExpertCard key={expert.id} expert={expert} featured />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SignupModal 
        open={signupModalOpen}
        onOpenChange={setSignupModalOpen}
        isProfessional={isProfessionalSignup}
      />
    </MainLayout>
  );
}

// Determine expert status based on role, approval, and verification
const getExpertStatus = (expert: any) => {
  if (expert.user?.role !== 'expert') return null;
  
  if (expert.user?.approved === 'no') {
    return { type: 'waiting', label: 'Waiting for Approval', color: 'bg-orange-100 text-orange-700' };
  }
  
  if (expert.user?.approved === 'yes' && expert.verificationStatus === 'verified') {
    return { type: 'verified', label: 'Verified Expert', color: 'bg-green-100 text-green-700' };
  }
  
  if (expert.user?.approved === 'yes') {
    return { type: 'approved', label: 'Verified Expert', color: 'bg-blue-100 text-blue-700' };
  }
  
  return null;
};

function ExpertCard({ expert, featured = false }: { expert: any; featured?: boolean }) {
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "EX";
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const expertStatus = getExpertStatus(expert);

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={expert.profileImageUrl || expert.user?.profileImageUrl} />
                <AvatarFallback className="bg-teal-100 text-teal-700">
                  {getInitials(expert.user?.firstName, expert.user?.lastName)}
                </AvatarFallback>
              </Avatar>
              {expertStatus?.type === 'verified' && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {expert.user?.firstName} {expert.user?.lastName}
              </CardTitle>
              <p className="text-sm text-gray-600">{expert.profession}</p>
              {expertStatus && (
                <Badge 
                  className={`${expertStatus.color} text-xs mt-1 flex items-center gap-1`}
                  data-testid={`badge-expert-${expertStatus.type}`}
                >
                  {expertStatus.type === 'verified' && <CheckCircle className="w-3 h-3" />}
                  {expertStatus.type === 'waiting' && <Clock className="w-3 h-3" />}
                  {expertStatus.type === 'approved' && <Star className="w-3 h-3" />}
                  {expertStatus.label}
                </Badge>
              )}
            </div>
          </div>
          {featured && (
            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {expert.expertiseArea && (
            <div>
              <Badge variant="secondary" className="text-xs">
                {expert.expertiseArea}
              </Badge>
            </div>
          )}

          {expert.yearsExperience && (
            <p className="text-sm text-gray-600">
              {expert.yearsExperience} years of experience
            </p>
          )}

          {expert.credentials && (
            <p className="text-sm text-gray-600">
              <strong>Credentials:</strong> {expert.credentials}
            </p>
          )}

          {expert.bio && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {expert.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {expert.website && (
              <a
                href={expert.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700"
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
            {expert.linkedinUrl && (
              <a
                href={expert.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Link href={`/expert/${expert.userId}`}>
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
            {expert.consultationEnabled && expert.consultationRate && (
              <Link href={`/book-consultation/${expert.userId}`}>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                  Book Call
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}