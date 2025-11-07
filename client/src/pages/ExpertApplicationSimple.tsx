import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, XCircle, CreditCard } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

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
  companyEmail: z.string().email("Please enter a valid company email"),
  consultationRate: z.number().min(50, "Minimum consultation rate is $50/hour").max(500, "Maximum rate is $500/hour"),
  consultationEnabled: z.boolean().default(true),
  reasonForApplying: z.string().min(20, "Please explain why you want to become a verified expert"),
});

type ExpertApplicationForm = z.infer<typeof expertApplicationSchema>;

const SimplePaymentForm = ({ 
  applicationData, 
  onSuccess 
}: { 
  applicationData: ExpertApplicationForm;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        throw error;
      }

      // Submit application with payment method
      const response = await apiRequest("POST", "/api/experts/apply-with-payment-method", {
        paymentMethodId: paymentMethod.id,
        ...applicationData
      });

      if (response.requiresAction) {
        // Handle 3D Secure
        const result = await stripe.confirmCardPayment(response.clientSecret);
        if (result.error) {
          throw result.error;
        }
      }

      toast({
        title: "Success!",
        description: "Your expert application has been submitted successfully.",
      });
      
      onSuccess();
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
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
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay $100 and Submit Application
          </>
        )}
      </Button>
    </form>
  );
};

export default function ExpertApplicationSimple() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [applicationData, setApplicationData] = useState<ExpertApplicationForm | null>(null);

  const form = useForm<ExpertApplicationForm>({
    resolver: zodResolver(expertApplicationSchema),
    defaultValues: {
      consultationEnabled: true,
      consultationRate: 100,
      yearsOfExperience: 1,
    },
  });

  // Check if user already has an application
  const { data: existingApplication, isLoading } = useQuery({
    queryKey: ['/api/experts/my-application'],
    enabled: !!user,
  });

  const onSubmit = (data: ExpertApplicationForm) => {
    setApplicationData(data);
    setStep('payment');
  };

  const onPaymentSuccess = () => {
    setStep('success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (existingApplication) {
    const getStatusIcon = (status: string) => {
      switch(status) {
        case 'verified':
          return <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />;
        case 'pending':
          return <Clock className="h-16 w-16 mx-auto mb-4 text-yellow-500" />;
        case 'rejected':
          return <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />;
        default:
          return <Clock className="h-16 w-16 mx-auto mb-4 text-gray-500" />;
      }
    };

    const getStatusMessage = (status: string) => {
      switch(status) {
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
              <Button onClick={() => window.location.href = '/community'}>
                Explore Community
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

  if (step === 'payment' && applicationData) {
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
              <p className="text-gray-600 mb-6">
                One-time verification fee of $100 ensures quality and authenticity of our expert community.
              </p>
              <Elements stripe={stripePromise}>
                <SimplePaymentForm 
                  applicationData={applicationData} 
                  onSuccess={onPaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Apply for Expert Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Financial Advisor, Elder Law Attorney" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expertiseArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Areas of Expertise</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your specific areas of expertise..."
                          className="resize-none"
                          {...field}
                        />
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
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
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
                      <FormLabel>Credentials & Qualifications</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List your credentials, certifications, and qualifications..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself and your professional background..."
                          className="resize-none h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on your expert profile
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
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your professional license number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company/Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company or organization name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Company Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Full company address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyEmail"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Company Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="company@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Consultation Settings</h3>
                  
                  <FormField
                    control={form.control}
                    name="consultationRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Consultation Rate ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Your hourly rate for consultations (USD)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reasonForApplying"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you want to become a verified expert?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain your motivation for joining our expert community..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Continue to Payment
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}