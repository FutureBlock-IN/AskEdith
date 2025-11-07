import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, XCircle, UserCheck, FileText, Globe, Linkedin } from "lucide-react";

const expertApplicationSchema = z.object({
  profession: z.string().min(2, "Profession is required"),
  expertiseArea: z.string().min(5, "Please describe your areas of expertise"),
  yearsOfExperience: z.number().min(1, "Years of experience must be at least 1").max(50, "Please enter a realistic number"),
  credentials: z.string().min(10, "Please provide your credentials and qualifications"),
  bio: z.string().min(50, "Please provide a detailed bio (at least 50 characters)"),
  licenseNumber: z.string().min(1, "License number is required"),
  // Company information
  company: z.string().min(2, "Company/Organization name is required"),
  companyAddress: z.string().min(10, "Company address is required"),
  companyWebsite: z.string().url("Please enter a valid company website URL").optional().or(z.literal("")),
  companyEmail: z.string().email("Please enter a valid company email"),
  // Professional links
  websiteUrl: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  blogUrl: z.string().url("Please enter a valid blog URL").optional().or(z.literal("")),
  booksUrl: z.string().url("Please enter a valid books/publications URL").optional().or(z.literal("")),
  articlesUrl: z.string().url("Please enter a valid articles URL").optional().or(z.literal("")),
  // Files and additional info
  profileImage: z.instanceof(File).optional(),
  licenseFile: z.instanceof(File, { message: "Please upload your professional license or certification" }),
  // Consultation settings
  consultationRate: z.number().min(50, "Minimum consultation rate is $50/hour").max(500, "Maximum rate is $500/hour"),
  consultationEnabled: z.boolean().default(true),
  reasonForApplying: z.string().min(20, "Please explain why you want to become a verified expert"),
  // LinkedIn import option
  importFromLinkedIn: z.boolean().default(false),
});

type ExpertApplicationForm = z.infer<typeof expertApplicationSchema>;

export default function ExpertApplication() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'success' | 'error'>('none');

  // Check if user already has an expert verification
  const { data: existingApplication, isLoading: checkingExisting } = useQuery({
    queryKey: ['/api/experts/my-application'],
    enabled: !!user?.id,
    retry: false,
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/experts/my-application');
      if (res.status === 404) {
        return null;
      }
      return res.json();
    }
  });

  const form = useForm<ExpertApplicationForm>({
    resolver: zodResolver(expertApplicationSchema),
    defaultValues: {
      profession: "",
      expertiseArea: "",
      yearsOfExperience: 5,
      credentials: "",
      bio: "",
      licenseNumber: "",
      company: "",
      companyAddress: "",
      companyWebsite: "",
      companyEmail: "",
      websiteUrl: "",
      linkedinUrl: "",
      blogUrl: "",
      booksUrl: "",
      articlesUrl: "",
      consultationRate: 150,
      consultationEnabled: true,
      reasonForApplying: "",
      importFromLinkedIn: false,
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async (data: ExpertApplicationForm) => {
      return await apiRequest("POST", "/api/experts/apply", data);
    },
    onSuccess: () => {
      setApplicationStatus('success');
      toast({
        title: "Application Submitted",
        description: "Your expert verification application has been submitted for review.",
      });
    },
    onError: (error: any) => {
      setApplicationStatus('error');
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpertApplicationForm) => {
    applicationMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in to apply for expert verification status.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show status if user already has an application
  if (existingApplication) {
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'verified':
          return <CheckCircle className="h-8 w-8 text-green-500" />;
        case 'pending':
          return <Clock className="h-8 w-8 text-yellow-500" />;
        case 'rejected':
          return <XCircle className="h-8 w-8 text-red-500" />;
        default:
          return <FileText className="h-8 w-8 text-gray-500" />;
      }
    };

    const getStatusMessage = (status: string) => {
      switch (status) {
        case 'verified':
          return {
            title: "You're Already Verified!",
            description: "Congratulations! You are already a verified expert on AskEdith.",
            action: "View Your Profile"
          };
        case 'pending':
          return {
            title: "Application Under Review",
            description: "Your expert verification application is currently being reviewed by our team.",
            action: "Update Application"
          };
        case 'rejected':
          return {
            title: "Application Not Approved",
            description: "Your previous application was not approved. You can submit a new application with updated information.",
            action: "Reapply"
          };
        default:
          return {
            title: "Application Submitted",
            description: "Your application has been submitted.",
            action: "View Status"
          };
      }
    };

    const statusInfo = getStatusMessage(existingApplication.verificationStatus);

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center p-8">
            {getStatusIcon(existingApplication.verificationStatus)}
            <h2 className="text-2xl font-semibold mt-4 mb-2">{statusInfo.title}</h2>
            <p className="text-gray-600 mb-6">{statusInfo.description}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">Application Details:</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Profession:</span> {existingApplication.profession}</p>
                <p><span className="font-medium">Expertise:</span> {existingApplication.expertiseArea}</p>
                <p><span className="font-medium">Experience:</span> {existingApplication.yearsOfExperience} years</p>
                <p><span className="font-medium">Status:</span> 
                  <Badge className="ml-2" variant={
                    existingApplication.verificationStatus === 'verified' ? 'default' :
                    existingApplication.verificationStatus === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {existingApplication.verificationStatus}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              {existingApplication.verificationStatus === 'verified' && (
                <Button onClick={() => window.location.href = `/expert/${user?.id}`}>
                  {statusInfo.action}
                </Button>
              )}
              {existingApplication.verificationStatus === 'rejected' && (
                <Button onClick={() => window.location.reload()}>
                  {statusInfo.action}
                </Button>
              )}
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Apply for Expert Verification</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our trusted community of verified experts and help families navigate caregiving challenges 
            with your professional expertise and experience.
          </p>
        </div>

        {/* Benefits Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Expert Verification Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Verified Expert Badge</h4>
                  <p className="text-sm text-gray-600">Display your credentials with a verified expert badge</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Featured Profile</h4>
                  <p className="text-sm text-gray-600">Get featured in our expert directory</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Source Attribution</h4>
                  <p className="text-sm text-gray-600">Link your content to original sources and publications</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Priority Support</h4>
                  <p className="text-sm text-gray-600">Enhanced visibility for your helpful contributions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Expert Verification Application</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Geriatrician, Social Worker, Elder Law Attorney" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., San Francisco, CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expertiseArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Areas of Expertise *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your specific areas of expertise in caregiving, healthcare, legal, financial, or other relevant fields..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Be specific about your specializations (e.g., dementia care, Medicare planning, elder law)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Professional Experience *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="credentials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credentials & Qualifications *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List your relevant degrees, certifications, licenses, and professional affiliations..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Include degrees, licenses, certifications, and professional memberships
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Bio *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your background, experience, and what drives your passion for helping families..."
                          className="min-h-[150px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on your expert profile page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Professional Website
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-website.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn Profile
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Consultation Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Consultation Settings</h3>
                  
                  <FormField
                    control={form.control}
                    name="consultationRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Consultation Rate (USD) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="50" 
                            max="500"
                            placeholder="150"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Set your hourly rate for consultation sessions ($50-$500)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consultationEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Allow appointment booking after verification
                          </FormLabel>
                          <FormDescription>
                            Enable clients to book paid consultation sessions with you
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reasonForApplying"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you want to become a verified expert? *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain your motivation for joining our expert community and how you plan to help families..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {applicationStatus === 'success' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your application has been submitted successfully! We'll review it and get back to you within 5-7 business days.
                    </AlertDescription>
                  </Alert>
                )}

                {applicationStatus === 'error' && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      There was an error submitting your application. Please try again.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4 pt-6">
                  <Button 
                    type="submit" 
                    disabled={applicationMutation.isPending}
                    className="flex-1 md:flex-none"
                  >
                    {applicationMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => window.history.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}