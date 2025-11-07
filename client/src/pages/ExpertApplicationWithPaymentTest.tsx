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
      toast({
        title: "Payment Error",
        description: "Stripe has not been properly initialized. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const card = elements.getElement(CardElement);
      if (!card) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
      });

      if (methodError) {
        throw methodError;
      }

      console.log('Payment method created:', paymentMethod.id);

      // Submit payment to our server
      const response = await apiRequest('POST', '/api/experts/confirm-verification-payment', {
        paymentMethodId: paymentMethod.id
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.requiresAction) {
        // Handle 3D Secure
        const { error: confirmError } = await stripe.confirmCardPayment(response.clientSecret);
        if (confirmError) {
          throw confirmError;
        }
      }

      toast({
        title: "Payment Successful",
        description: "Your verification fee has been processed. Submitting your application...",
      });
      onPaymentSuccess();

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred while processing your payment. Please try again.",
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

export default function ExpertApplicationWithPaymentTest() {
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

  const submitApplicationMutation = useMutation({
    mutationFn: async (data: ExpertApplicationForm) => {
      let profileImageUrl: string | undefined = undefined;
      let licenseFileUrl: string | undefined = undefined;

      if (!user) {
        throw new Error("User not authenticated for file upload.");
      }

      try {
        // Handle profile image upload
        if (profileImage) {
          console.log('Uploading profile image...');
          const { url, error } = await uploadFile(profileImage, user.id, 'profile');
          if (error) {
            throw new Error(`Profile image upload failed: ${error}`);
          }
          profileImageUrl = url || undefined;
        }

        // Handle license file upload
        if (licenseFile) {
          console.log('Uploading license file...');
          const { url, error } = await uploadFile(licenseFile, user.id, 'license');
          if (error) {
            throw new Error(`License file upload failed: ${error}`);
          }
          licenseFileUrl = url || undefined;
        }
        
        console.log('Files uploaded successfully, submitting application...');
        const payload = { ...data, profileImageUrl, licenseFileUrl };
        
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
    setStep('payment');
  };

  const onPaymentSuccess = () => {
    if (applicationData) {
      submitApplicationMutation.mutate(applicationData);
    }
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
                <PaymentForm onPaymentSuccess={onPaymentSuccess} />
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
        
        <p className="text-center text-gray-600">Form would go here...</p>
        <Button onClick={() => setStep('payment')} className="mx-auto block mt-8">
          Proceed to Payment (Test)
        </Button>
      </div>
    </div>
  );
}