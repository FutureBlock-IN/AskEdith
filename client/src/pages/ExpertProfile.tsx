import { Calendar, MapPin, Award, ExternalLink, CheckCircle, Linkedin, Clock, Star } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ExpertBadge from "@/components/ExpertBadge";
import type { PostWithAuthorAndCategory } from "@shared/schema";

interface ExpertData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  bio?: string;
  expertise?: string[];
  hourlyRate: number;
  stripeConnectAccountId?: string;
  consultationEnabled: boolean;
  profession?: string;
  company?: string;
  expertiseArea?: string;
  credentials?: string;
  linkedinUrl?: string;
  verifiedAt?: string;
  consultationRate?: number;
  // Added fields for badge logic
  role: string;
  approved: string;
  verificationStatus: string;
  // Appointment booking fields
  allowBooking?: boolean;
  calendlyLink?: string;
}

// Determine expert status based on role, approval, and verification
const getExpertStatus = (expert: ExpertData) => {
  if (expert.role !== 'expert') return null;
  
  if (expert.approved === 'no') {
    return { type: 'waiting', label: 'Waiting for Approval', color: 'bg-orange-100 text-orange-700' };
  }
  
  if (expert.approved === 'yes' && expert.verificationStatus === 'verified') {
    return { type: 'verified', label: 'Verified Expert', color: 'bg-green-100 text-green-700' };
  }
  
  if (expert.approved === 'yes') {
    return { type: 'approved', label: 'Verified Expert', color: 'bg-blue-100 text-blue-700' };
  }
  
  return null;
};

export default function ExpertProfile() {
  const [match, params] = useRoute('/expert/:id');
  const expertId = params?.id;

  const { data: expert, isLoading, error } = useQuery<ExpertData>({
    queryKey: ['/api/experts', expertId, 'profile'],
    enabled: !!expertId,
  });

  const { data: expertPosts } = useQuery<PostWithAuthorAndCategory[]>({
    queryKey: ['/api/posts/user', expertId],
    enabled: !!expertId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Expert Not Found</h2>
          <p className="text-gray-600 mb-6">The expert profile you're looking for doesn't exist.</p>
          <Link href="/experts">
            <Button>Back to Expert Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  const postCount = expertPosts?.length || 0;
  const expertLevel = postCount >= 100 ? 'gold' : postCount >= 50 ? 'silver' : 'bronze';
  const expertStatus = getExpertStatus(expert);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-start space-x-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={expert.profileImageUrl} />
              <AvatarFallback className="bg-teal-500 text-white text-2xl">
                {expert.firstName?.[0]}{expert.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {expert.firstName} {expert.lastName}
                </h1>
                {expertStatus && (
                  <Badge 
                    className={`${expertStatus.color} flex items-center gap-1`}
                    data-testid={`badge-expert-${expertStatus.type}`}
                  >
                    {expertStatus.type === 'verified' && <CheckCircle className="w-3 h-3" />}
                    {expertStatus.type === 'waiting' && <Clock className="w-3 h-3" />}
                    {expertStatus.type === 'approved' && <Star className="w-3 h-3" />}
                    {expertStatus.label}
                  </Badge>
                )}
                <ExpertBadge level={expertLevel} postCount={postCount} />
              </div>
              
              <p className="text-xl text-gray-700 mb-3">{expert.profession}</p>
              <p className="text-lg text-gray-600 mb-3">{expert.company}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Location not specified
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  15+ years experience
                </span>
                <span>{postCount} community posts</span>
              </div>
              
              <div className="flex items-center gap-3">
                {expert.allowBooking && 
                 expert.calendlyLink && 
                 expert.approved === 'yes' && 
                 expert.hourlyRate && (
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
                    asChild
                    data-testid="button-book-consultation"
                  >
                    <a 
                      href={expert.calendlyLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Calendar className="w-4 h-4" />
                      Book Consultation - ${expert.hourlyRate}/hour
                    </a>
                  </Button>
                )}
                {expert.allowBooking && 
                 expert.calendlyLink && 
                 expert.approved === 'yes' && 
                 expert.verificationStatus === 'verified' && (
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
                    asChild
                    data-testid="button-book-appointment"
                  >
                    <a 
                      href={expert.calendlyLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Calendar className="w-4 h-4" />
                      Book Appointment
                    </a>
                  </Button>
                )}
                {expert.linkedinUrl && (
                  <Button variant="outline" className="flex items-center gap-2" asChild>
                    <a href={expert.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4" />
                      View LinkedIn Profile
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Left Column - Bio & Credentials */}
          <div className="md:col-span-2 space-y-6">
            
            {/* About */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About {expert.firstName} {expert.lastName}</h2>
              <p className="text-gray-700 leading-relaxed">{expert.bio}</p>
            </Card>

            {/* Expertise Areas */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas of Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {expert.expertiseArea && (
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700">
                    {expert.expertiseArea}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Recent Community Contributions */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Community Contributions</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-medium text-gray-900">Fall Prevention Strategies for Seniors</h3>
                  <p className="text-sm text-gray-600 mt-1">Comprehensive guide on home safety modifications and exercises to reduce fall risk...</p>
                  <span className="text-xs text-gray-500">2 days ago • 45 helpful votes</span>
                </div>
                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-medium text-gray-900">Managing Multiple Medications Safely</h3>
                  <p className="text-sm text-gray-600 mt-1">Tips for organizing pills, avoiding interactions, and working with your healthcare team...</p>
                  <span className="text-xs text-gray-500">1 week ago • 62 helpful votes</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Quick Info */}
          <div className="space-y-6">
            
            {/* Credentials */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-teal-700 mb-3">Credentials</h3>
              <div className="text-gray-700">
                {expert.credentials?.split('\n').map((credential, index) => (
                  <div key={index}>
                    <div className="text-sm py-1">{credential}</div>
                    {index < expert.credentials!.split('\n').length - 1 && (
                      <div className="border-b border-teal-700 my-1" style={{ borderBottomWidth: '0.5px' }}></div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Verified {expert.verifiedAt ? new Date(expert.verifiedAt).toLocaleDateString() : 'Recently verified'}</p>
            </Card>

            {/* Consultation Info */}
            {expert.consultationEnabled && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Consultation Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rate:</span>
                    <span className="font-medium">${expert.hourlyRate}/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response time:</span>
                    <span className="font-medium text-green-600">Usually within 24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consultations:</span>
                    <span className="font-medium">Video or Phone</span>
                  </div>
                </div>
                {expert.calendlyLink ? (
                  <Button 
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
                    asChild
                    data-testid="button-schedule-consultation"
                  >
                    <a 
                      href={expert.calendlyLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Schedule Consultation
                    </a>
                  </Button>
                ) : (
                  <Button 
                    className="w-full mt-4 bg-gray-400 cursor-not-allowed" 
                    disabled
                  >
                    Calendly Link Not Available
                  </Button>
                )}
              </Card>
            )}

            {/* Community Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Community Impact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Posts this year:</span>
                  <span className="font-medium">{postCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Helpful votes:</span>
                  <span className="font-medium">2,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">People helped:</span>
                  <span className="font-medium">1,200+</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}