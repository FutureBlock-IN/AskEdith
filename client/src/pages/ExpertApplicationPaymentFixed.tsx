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
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Load Stripe
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
  company: z.string().min(2, "Company/Organization name is required"),
  companyAddress: z.string().min(10, "Company address is required"),
  companyWebsite: z.string().url("Please enter a valid company website URL").optional().or(z.literal("")),
  companyEmail: z.string().email("Please enter a valid company email"),
  websiteUrl: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  blogUrl: z.string().url("Please enter a valid blog URL").optional().or(z.literal("")),
  booksUrl: z.string().url("Please enter a valid books/publications URL").optional().or(z.literal("")),
  articlesUrl: z.string().url("Please enter a valid articles URL").optional().or(z.literal("")),
  consultationRate: z.number().min(50, "Minimum consultation rate is $50/hour").max(500, "Maximum rate is $500/hour"),
  consultationEnabled: z.boolean().default(true),
  reasonForApplying: z.string().min(20, "Please explain why you want to become a verified expert"),
  importFromLinkedIn: z.boolean().default(false),
});

type ExpertApplicationForm = z.infer<typeof expertApplicationSchema>;

// Simplified payment form that creates payment intent on demand
const PaymentForm = ({ applicationData, profileImage, licenseFile, onSuccess }: { 
  applicationData: ExpertApplicationForm;
  profileImage: File | null;
  licenseFile: File | null;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      toast({
        title: "Error",
        description: "Payment system not ready. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get card element
      const card = elements.getElement(CardElement);
      if (!card) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
      });

      if (pmError) {
        throw pmError;
      }

      // Upload files first if they exist
      let profileImageUrl: string | undefined;
      let licenseFileUrl: string | undefined;

      if (profileImage) {
        console.log('Uploading profile image...');
        const { url, error } = await uploadFile(profileImage, user.id, 'profile');
        if (error) throw new Error(`Profile image upload failed: ${error}`);
        profileImageUrl = url || undefined;
      }

      if (licenseFile) {
        console.log('Uploading license file...');
        const { url, error } = await uploadFile(licenseFile, user.id, 'license');
        if (error) throw new Error(`License file upload failed: ${error}`);
        licenseFileUrl = url || undefined;
      }

      // Submit application with payment method
      const response = await apiRequest('POST', '/api/experts/apply-with-payment-method', {
        ...applicationData,
        profileImageUrl,
        licenseFileUrl,
        paymentMethodId: paymentMethod.id
      });

      const result = await response.json();

      if (result.requiresAction && result.clientSecret) {
        // Handle 3D Secure
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
        if (confirmError) {
          throw confirmError;
        }
      }

      toast({
        title: "Success!",
        description: "Your expert application and payment have been processed.",
      });
      onSuccess();

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
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

      <div className="p-4 border rounded-lg">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
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

export default function ExpertApplicationPaymentFixed() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
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

  const onFormSubmit = (data: ExpertApplicationForm) => {
    setApplicationData(data);
    setStep('payment');
  };

  const onPaymentSuccess = () => {
    setStep('success');
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

  if (existingApplication) {
    const status = existingApplication.verificationStatus;
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {status === 'pending' && <Clock className="h-6 w-6 text-yellow-500" />}
              {status === 'approved' && <CheckCircle className="h-6 w-6 text-green-500" />}
              {status === 'rejected' && <XCircle className="h-6 w-6 text-red-500" />}
              Expert Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Status:</span>
                <Badge variant={
                  status === 'pending' ? 'default' :
                  status === 'approved' ? 'default' :
                  'destructive'
                } className={
                  status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  status === 'approved' ? 'bg-green-100 text-green-800' :
                  ''
                }>
                  {status === 'pending' && 'Under Review'}
                  {status === 'approved' && 'Verified Expert'}
                  {status === 'rejected' && 'Application Rejected'}
                </Badge>
              </div>
              
              {status === 'pending' && (
                <p className="text-gray-600">
                  Your application is currently under review. We'll notify you via email once a decision has been made, typically within 3-5 business days.
                </p>
              )}
              
              {status === 'approved' && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Congratulations! You're now a verified expert. You can start accepting consultations.
                  </p>
                  <Button onClick={() => window.location.href = '/dashboard'}>
                    Go to Dashboard
                  </Button>
                </div>
              )}
              
              {status === 'rejected' && existingApplication.reviewNotes && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-red-800 font-medium mb-2">Feedback from our review team:</p>
                  <p className="text-red-700">{existingApplication.reviewNotes}</p>
                </div>
              )}
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Your Expert Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <PaymentForm 
                  applicationData={applicationData!} 
                  profileImage={profileImage}
                  licenseFile={licenseFile}
                  onSuccess={onPaymentSuccess} 
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
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

  // The form would go here, but for this test we'll just show the payment step
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Apply for Expert Verification</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our trusted community of verified experts and start earning through consultations. 
            One-time $100 verification fee ensures quality and authenticity.
          </p>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <p className="text-gray-600 text-center">Application form would go here...</p>
            <Button 
              onClick={() => {
                setApplicationData({
                  profession: "Financial Planner",
                  expertiseArea: "Retirement planning and wealth management",
                  yearsOfExperience: 10,
                  credentials: "CFP, ChFC",
                  bio: "I help families plan for a secure retirement with over 10 years of experience in wealth management and financial planning.",
                  licenseNumber: "CFP123456",
                  company: "Retirement Planning Associates",
                  companyAddress: "123 Main St, Suite 100, Anytown, USA 12345",
                  companyWebsite: "https://example.com",
                  companyEmail: "info@example.com",
                  websiteUrl: "",
                  linkedinUrl: "",
                  blogUrl: "",
                  booksUrl: "",
                  articlesUrl: "",
                  consultationRate: 150,
                  consultationEnabled: true,
                  reasonForApplying: "I want to help more families achieve their retirement goals through personalized guidance.",
                  importFromLinkedIn: false,
                });
                setStep('payment');
              }} 
              className="mx-auto block mt-8"
            >
              Proceed to Payment (Test)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}