import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, DollarSign, CreditCard, User, Mail, MessageSquare, CheckCircle } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useToast } from "@/hooks/use-toast";
import DefaultProfilePicture from "@/components/DefaultProfilePicture";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const bookingSchema = z.object({
  scheduledAt: z.string().min(1, "Please select a date and time"),
  duration: z.number().min(30, "Minimum duration is 30 minutes").max(120, "Maximum duration is 2 hours"),
  notes: z.string().optional(),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientName: z.string().min(2, "Please enter your full name"),
});

type BookingForm = z.infer<typeof bookingSchema>;

const BookingFormWithPayment = ({ 
  expert, 
  onSuccess 
}: { 
  expert: any;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      duration: 60,
      notes: "",
      clientEmail: user?.email || "",
      clientName: user ? `${user.firstName} ${user.lastName}` : "",
    },
  });

  const handleSubmit = async (data: BookingForm) => {
    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Payment system not ready. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // First, confirm the payment
    const { error: paymentError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/consultation-success`,
      },
      redirect: "if_required",
    });

    if (paymentError) {
      toast({
        title: "Payment Failed",
        description: paymentError.message,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    // If payment successful, finalize the booking
    try {
      const scheduledAt = `${selectedDate}T${selectedTime}:00`;
      await apiRequest("POST", "/api/consultations/finalize", {
        ...data,
        scheduledAt,
        expertId: expert.id,
      });

      toast({
        title: "Success!",
        description: "Your consultation has been booked successfully.",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Payment successful but booking failed. Please contact support.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const hourlyRate = 100; // Fixed $100/hour rate

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Date & Time Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                form.setValue('scheduledAt', `${e.target.value}T${selectedTime || '09:00'}:00`);
              }}
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Time</label>
            <select
              value={selectedTime}
              onChange={(e) => {
                setSelectedTime(e.target.value);
                if (selectedDate) {
                  form.setValue('scheduledAt', `${selectedDate}T${e.target.value}:00`);
                }
              }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              required
            >
              <option value="">Choose a time</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration Selection */}
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Duration</FormLabel>
              <FormControl>
                <select
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What would you like to discuss? (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of what you'd like to cover..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cost Summary */}
        {form.watch('duration') && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Cost Summary</h4>
            <div className="flex justify-between items-center">
              <span>{form.watch('duration')} minute consultation</span>
              <span className="font-bold">
                ${((hourlyRate * form.watch('duration')) / 60).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Payment Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Payment Information</h3>
          <div className="border rounded-lg p-4">
            <PaymentElement />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={!selectedDate || !selectedTime || isProcessing || !stripe || !elements}
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
              Book & Pay ${((hourlyRate * form.watch('duration')) / 60).toFixed(2)}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default function BookConsultation() {
  const { expertId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'booking' | 'success'>('booking');
  const [clientSecret, setClientSecret] = useState("");

  // Fetch expert details
  const { data: expert, isLoading: expertLoading } = useQuery({
    queryKey: [`/api/experts/${expertId}`],
    enabled: !!expertId,
  });

  // Initialize payment intent
  const [paymentError, setPaymentError] = useState(false);
  
  useEffect(() => {
    if (expert && isAuthenticated && !clientSecret && !paymentError) {
      const initializePayment = async () => {
        try {
          const duration = 60; // Default 60 minutes
          // Fixed rate of $100/hour
          const rate = 10000; // $100 in cents
          const totalAmount = Math.round((rate * duration) / 60);
          
          console.log("Initializing payment:", { 
            expertId, 
            duration, 
            rate, 
            totalAmount,
            expert 
          });
          
          const response = await apiRequest("POST", "/api/consultations/create-payment", { 
            expertId: expertId!,
            duration,
            totalAmount,
          });
          
          console.log("Payment response:", response);
          
          if (response.clientSecret) {
            setClientSecret(response.clientSecret);
          } else {
            throw new Error("No client secret received");
          }
        } catch (error: any) {
          console.error("Failed to initialize payment:", error);
          setPaymentError(true);
          toast({
            title: "Error",
            description: error.message || "Failed to initialize payment. Please refresh and try again.",
            variant: "destructive",
          });
        }
      };
      
      initializePayment();
    }
  }, [expert, isAuthenticated, expertId, clientSecret, paymentError]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in to book a consultation.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (expertLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expert information...</p>
        </div>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <h2 className="text-2xl font-semibold mb-4">Payment System Error</h2>
            <p className="text-gray-600 mb-6">
              Unable to initialize the payment system. Please try again later or contact support.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <h2 className="text-2xl font-semibold mb-4">Expert Not Found</h2>
            <p className="text-gray-600 mb-6">
              The expert you're looking for doesn't exist or isn't available for consultations.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expert.consultationEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <h2 className="text-2xl font-semibold mb-4">Consultations Not Available</h2>
            <p className="text-gray-600 mb-6">
              This expert is not currently accepting consultation bookings.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
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
            <h2 className="text-3xl font-semibold mb-4">Consultation Booked Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your consultation with {expert.firstName} {expert.lastName} has been confirmed. 
              You'll receive a confirmation email with meeting details shortly.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.href = '/'}>
                Return to Home
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                View My Bookings
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
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4">
              {expert.photoUrl ? (
                <img
                  src={expert.photoUrl}
                  alt={expert.name}
                  className="w-24 h-24 rounded-full mx-auto object-cover"
                />
              ) : (
                <DefaultProfilePicture
                  name={expert.name}
                  className="w-24 h-24 mx-auto"
                  theme={expert.profileTheme}
                />
              )}
            </div>
            <CardTitle className="text-2xl">Book a Consultation with {expert.name}</CardTitle>
            <CardDescription>
              {expert.badge && (
                <Badge variant="secondary" className="mt-2">
                  {expert.badge} Expert
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <BookingFormWithPayment 
                  expert={expert}
                  onSuccess={() => setStep('success')}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Setting up payment system...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}