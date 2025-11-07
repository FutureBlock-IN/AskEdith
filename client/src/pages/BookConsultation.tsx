import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import DefaultProfilePicture from "@/components/DefaultProfilePicture";

// Only initialize Stripe if the public key is available
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const bookingSchema = z.object({
  scheduledAt: z.string().min(1, "Please select a date and time"),
  duration: z.number().min(30, "Minimum duration is 30 minutes").max(120, "Maximum duration is 2 hours"),
  notes: z.string().optional(),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientName: z.string().min(2, "Please enter your full name"),
});

type BookingForm = z.infer<typeof bookingSchema>;

const ConsultationPaymentForm = ({ 
  bookingData, 
  totalAmount, 
  onPaymentSuccess 
}: { 
  bookingData: BookingForm & { expertId: string };
  totalAmount: number;
  onPaymentSuccess: () => void;
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

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/consultation/success",
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Your consultation has been booked successfully!",
      });
      onPaymentSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-teal-600" />
          <h3 className="font-semibold text-teal-800">Consultation Fee</h3>
        </div>
        <p className="text-teal-700 text-sm mb-3">
          {bookingData.duration} minute consultation session
        </p>
        <div className="text-2xl font-bold text-teal-800">
          ${(totalAmount / 100).toFixed(2)}
        </div>
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
            Book Consultation - ${(totalAmount / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

export default function BookConsultation() {
  const { expertId } = useParams();
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'booking' | 'success'>('booking');
  const [clientSecret, setClientSecret] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Fetch expert details
  const { data: expert, isLoading: expertLoading } = useQuery({
    queryKey: [`/api/experts/${expertId}`],
    enabled: !!expertId,
  }) as { data: any, isLoading: boolean, error?: any };

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      duration: 60,
      notes: "",
      clientEmail: user?.email || "",
      clientName: user ? `${user.firstName} ${user.lastName}` : "",
    },
  });

  // Initialize payment intent when form loads
  useEffect(() => {
    if (expert?.consultationRate) {
      const initializePayment = async () => {
        try {
          const totalAmount = Math.round((expert.consultationRate * 60) / 60 * 100); // Default 60 minutes
          const response = await apiRequest("POST", "/api/consultations/create-payment", { 
            expertId: expertId!,
            totalAmount 
          });
          setClientSecret(response.clientSecret);
        } catch (error) {
          console.error("Failed to initialize payment:", error);
        }
      };
      initializePayment();
    }
  }, [expert?.consultationRate, expertId]);

  const bookConsultationMutation = useMutation({
    mutationFn: async (data: BookingForm & { expertId: string }) => {
      const scheduledAt = `${selectedDate}T${selectedTime}:00`;
      const totalAmount = Math.round((expert.consultationRate * data.duration) / 60 * 100);
      
      return await apiRequest("POST", "/api/consultations/book", { 
        ...data,
        scheduledAt,
        totalAmount 
      });
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: "Success!",
        description: "Your consultation has been booked successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book consultation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onBookingSubmit = async (data: BookingForm) => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your consultation.",
        variant: "destructive",
      });
      return;
    }

    if (!clientSecret) {
      toast({
        title: "Payment Not Ready",
        description: "Payment system is initializing. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    // Form will be handled by the Stripe Elements wrapper
    // The actual submission happens in the payment form after successful payment
  };

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
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
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


  // Generate available time slots (simplified - real implementation would check expert's calendar)
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
  const hourlyRate = expert.consultationRate / 100; // Convert from cents

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Expert Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {expert.profileImageUrl ? (
                  <img 
                    src={expert.profileImageUrl} 
                    alt={`${expert.firstName} ${expert.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DefaultProfilePicture size={96} />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {expert.firstName} {expert.lastName}
                  </h1>
                  <Badge className="bg-green-100 text-green-800">
                    Verified Expert
                  </Badge>
                </div>
                
                <p className="text-lg text-gray-700 mb-2">{expert.profession}</p>
                <p className="text-gray-600 mb-4">{expert.expertiseArea}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {expert.yearsExperience} years experience
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ${hourlyRate}/hour
                  </span>
                </div>
              </div>
            </div>
            
            {expert.bio && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-gray-700">{expert.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Book a Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onBookingSubmit)} className="space-y-6">
                
                {/* Date Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Date & Time</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Time</label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select a time</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value={30}>30 minutes - ${(hourlyRate * 0.5).toFixed(2)}</option>
                          <option value={60}>60 minutes - ${hourlyRate.toFixed(2)}</option>
                          <option value={90}>90 minutes - ${(hourlyRate * 1.5).toFixed(2)}</option>
                          <option value={120}>120 minutes - ${(hourlyRate * 2).toFixed(2)}</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
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
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Consultation Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to discuss? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of what you'd like to cover in the consultation..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Help the expert prepare for your session by sharing key topics or questions
                      </FormDescription>
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
                  {!stripePromise ? (
                    <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                        <p className="font-medium text-yellow-800">Payment System Not Configured</p>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Stripe payment processing is not configured in this development environment. 
                        Add the VITE_STRIPE_PUBLIC_KEY environment variable to enable payments.
                      </p>
                    </div>
                  ) : clientSecret ? (
                    <div className="border rounded-lg p-4">
                      <PaymentElement />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        Initializing secure payment...
                      </p>
                      <div className="animate-pulse space-y-3 mt-3">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-10 bg-gray-200 rounded"></div>
                          <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={!selectedDate || !selectedTime || !stripePromise}
                  className="w-full"
                  size="lg"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {!stripePromise ? "Payment System Required" : "Submit Consultation Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}