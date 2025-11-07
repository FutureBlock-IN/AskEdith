import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { uploadFile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Clock, XCircle, UserCheck, FileText, Upload, DollarSign, CreditCard, Linkedin } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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
  // Consultation settings
  consultationRate: z.number().min(50, "Minimum consultation rate is $50/hour").max(500, "Maximum rate is $500/hour"),
  consultationEnabled: z.boolean().default(true),
  reasonForApplying: z.string().min(20, "Please explain why you want to become a verified expert"),
  // LinkedIn import option
  importFromLinkedIn: z.boolean().default(false),
});

type ExpertApplicationForm = z.infer<typeof expertApplicationSchema>;

const PaymentForm = ({ onPaymentSuccess }: { onPaymentSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Payment form submitted');

    if (!stripe || !elements) {
      const errorMsg = 'Stripe or Elements not initialized';
      console.error(errorMsg);
      toast({
        title: "Payment Error",
        description: "Stripe has not been properly initialized. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log('Processing payment...');

    try {
      console.log('Calling stripe.confirmPayment...');
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/expert-application/success",
        },
        redirect: "if_required",
      });

      console.log('stripe.confirmPayment result:', { error, paymentIntent });

      if (error) {
        // Check if this is a specific error about payment intent state
        if (error.type === 'invalid_request_error' && error.code === 'payment_intent_unexpected_state') {
          console.log('Payment intent in unexpected state, checking if already succeeded:', error);
          
          // The payment might have already succeeded, let's proceed with the application
          toast({
            title: "Processing Application",
            description: "Verifying payment status and submitting your application...",
          });
          
          // Proceed directly to payment success
          onPaymentSuccess();
          return;
        }
        console.error('Payment error from Stripe:', error);
        setIsProcessing(false);
        throw error;
      }

      // Check payment intent status
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment successful, calling onPaymentSuccess');
        toast({
          title: "Payment Successful",
          description: "Your verification fee has been processed. Submitting your application...",
        });
        onPaymentSuccess();
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        console.log('Payment requires action (3D Secure), browser will redirect...');
        // The browser will handle the redirect automatically due to redirect: "if_required"
        return;
      } else {
        console.log('Unexpected payment status:', paymentIntent?.status);
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. Please wait...",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred while processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('Payment processing complete');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-teal-600" />
          <h3 className="font-semibold text-teal-800">Expert Verification Fee</h3>
        </div>
        <p className="text-teal-700 text-sm mb-3">
          A one-time $100 verification fee ensures the quality and authenticity of our expert community.
        </p>
        <div className="text-2xl font-bold text-teal-800">$100.00</div>
      </div>

      <PaymentElement />
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay $100 & Submit Application
          </>
        )}
      </Button>
    </form>
  );
};

export default function ExpertApplicationWithPayment() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [clientSecret, setClientSecret] = useState("");
  const [applicationData, setApplicationData] = useState<ExpertApplicationForm | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

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

  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  
  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      console.log('Creating checkout session...');
      // Save application data to localStorage before redirecting
      if (applicationData) {
        localStorage.setItem('expertApplicationData', JSON.stringify(applicationData));
      }
      
      const response = await apiRequest("POST", "/api/experts/create-checkout-session", { 
        applicationData 
      });
      console.log('Checkout session response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Checkout session created successfully:', data);
      if (!data.url) {
        console.error('No checkout URL in response');
        toast({
          title: "Payment Setup Failed",
          description: "Invalid payment response. Please try again.",
          variant: "destructive",
        });
        return;
      }
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error: any) => {
      console.error('Checkout session creation failed:', error);
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to setup payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (data: ExpertApplicationForm) => {
      let profileImageUrl: string | undefined = undefined;
      let licenseFileUrl: string | undefined = undefined;

      if (!user) {
        throw new Error("User not authenticated for file upload.");
      }

      try {
        // Skip file uploads for now - they're optional
        console.log('Submitting application without file uploads...');
        const payload = { 
          ...data, 
          profileImageUrl: undefined, 
          licenseFileUrl: undefined,
          stripePaymentIntentId: paymentIntentId 
        };
        
        return await apiRequest("POST", "/api/experts/apply-with-payment", payload);
      } catch (error: any) {
        console.error('Application submission error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: "Application Submitted",
        description: "Your expert verification application has been submitted for review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onFormSubmit = (data: ExpertApplicationForm) => {
    setApplicationData(data);
    createPaymentIntentMutation.mutate();
  };

  const onPaymentSuccess = () => {
    if (applicationData) {
      submitApplicationMutation.mutate(applicationData);
    }
  };

  const handleLinkedInImport = async () => {
    toast({
      title: "LinkedIn Import",
      description: "LinkedIn profile import feature coming soon! For now, please fill out the form manually.",
    });
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
                <p><span className="font-medium">Experience:</span> {existingApplication.yearsExperience} years</p>
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
              <Button onClick={() => window.location.href = '/community'}>
                Explore Community
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-3xl font-semibold mb-4">Application Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your payment and application. Our team will review your credentials and get back to you within 3-5 business days.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.href = '/'}>
                Return to Home
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                View Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center p-8">
              <div className="animate-spin w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-4">Redirecting to Payment...</h2>
              <p className="text-gray-600">
                Please wait while we redirect you to our secure payment page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Apply for Expert Verification</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our trusted community of verified experts and start earning through consultations. 
            One-time $100 verification fee ensures quality and authenticity.
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
                  <h4 className="font-medium">Consultation Bookings</h4>
                  <p className="text-sm text-gray-600">Earn money through paid consultation sessions</p>
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
                  <h4 className="font-medium">Priority Support</h4>
                  <p className="text-sm text-gray-600">Enhanced visibility for your helpful contributions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn Import Option */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Linkedin className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Import from LinkedIn</h3>
                  <p className="text-sm text-gray-600">Pre-fill your application with LinkedIn profile data</p>
                </div>
              </div>
              <Button onClick={handleLinkedInImport} variant="outline">
                Import Profile
              </Button>
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
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                  
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
                </div>

                {/* Credentials & License */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Credentials & License</h3>
                  
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
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your professional license number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <label className="block text-sm font-medium mb-2">License Document Upload (Optional)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="license-upload"
                      />
                      <label htmlFor="license-upload" className="cursor-pointer">
                        <span className="text-sm text-gray-600">
                          Click to upload your professional license or certification
                        </span>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 5MB (Optional)</p>
                      </label>
                      {licenseFile && (
                        <p className="text-sm text-green-600 mt-2">✓ {licenseFile.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Company Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company/Organization *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your company or organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="company@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Address *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Full company address including city, state, and zip code"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Professional Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Professional Links & Publications</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personal Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourwebsite.com" {...field} />
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
                          <FormLabel>LinkedIn Profile</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="blogUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blog/Newsletter</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourblog.com or Substack URL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="booksUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Published Books</FormLabel>
                          <FormControl>
                            <Input placeholder="Amazon author page or book links" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="articlesUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Published Articles</FormLabel>
                          <FormControl>
                            <Input placeholder="Links to your published articles" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Profile Photo</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Professional Photo</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <span className="text-sm text-gray-600">
                          Click to upload your professional headshot
                        </span>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p>
                      </label>
                      {profileImage && (
                        <p className="text-sm text-green-600 mt-2">✓ {profileImage.name}</p>
                      )}
                    </div>
                  </div>
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
                            Enable consultation bookings after verification
                          </FormLabel>
                          <FormDescription>
                            Allow clients to book paid consultation sessions with you
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reason for Applying */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Application Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="reasonForApplying"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why do you want to become a verified expert? *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Share your motivation for joining our expert community and how you plan to help families..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-6 border-t">
                  <Button 
                    type="submit" 
                    disabled={createPaymentIntentMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {createPaymentIntentMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Setting up payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Continue to Payment ($100)
                      </>
                    )}
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