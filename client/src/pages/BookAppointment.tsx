import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Expert {
  id: string;
  name: string;
  bio: string;
  profession: string;
  specializations: string[];
  hourlyRate: number;
  profileImageUrl?: string;
  rating: {
    average: number;
    count: number;
  };
  nextAvailable: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// Main booking component
export default function BookAppointment() {
  const { expertId } = useParams();
  const [location, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Elements stripe={stripePromise}>
          <BookingFlow expertId={expertId!} />
        </Elements>
      </div>
    </div>
  );
}

// Booking flow component
function BookingFlow({ expertId }: { expertId: string }) {
  const [step, setStep] = useState(1);
  const [userTimezone, setUserTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  });
  
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    utcTime: '', // Store UTC time for booking
    duration: 60,
    notes: '',
    clientName: '',
    clientEmail: '',
    timezone: userTimezone
  });

  // Fetch expert data
  const { data: expert, isLoading: expertLoading } = useQuery({
    queryKey: ['expert', expertId],
    queryFn: async () => {
      const response = await fetch(`/api/experts/${expertId}/profile`);
      if (!response.ok) throw new Error('Failed to fetch expert');
      return response.json() as Promise<Expert>;
    }
  });

  if (expertLoading) {
    return <div className="text-center py-12">Loading expert information...</div>;
  }

  if (!expert) {
    return <div className="text-center py-12">Expert not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Book Consultation</h1>
            <p className="text-blue-100">Step {step} of 4</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">Your timezone</p>
            <p className="text-sm font-mono">{userTimezone}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 h-2">
        <div 
          className="bg-blue-600 h-2 transition-all duration-300" 
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Expert info */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {expert.profileImageUrl && (
            <img 
              src={expert.profileImageUrl} 
              alt={expert.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{expert.name}</h2>
            <p className="text-gray-600">{expert.profession}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-yellow-500">★</span>
              <span>{expert.rating.average.toFixed(1)}</span>
              <span className="text-gray-500">({expert.rating.count} reviews)</span>
              <span className="text-gray-300">•</span>
              <span className="font-medium">${expert.hourlyRate}/hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking steps */}
      <div className="p-6">
        {step === 1 && (
          <DateSelection 
            expertId={expertId}
            selectedDate={bookingData.date}
            onDateSelect={(date) => {
              setBookingData(prev => ({ ...prev, date }));
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <TimeSelection 
            expertId={expertId}
            selectedDate={bookingData.date}
            selectedTime={bookingData.time}
            duration={bookingData.duration}
            userTimezone={userTimezone}
            onTimeSelect={(time, utcTime) => {
              setBookingData(prev => ({ ...prev, time, utcTime }));
              setStep(3);
            }}
            onDurationChange={(duration) => {
              setBookingData(prev => ({ ...prev, duration }));
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <BookingDetails 
            data={bookingData}
            onChange={(updates) => setBookingData(prev => ({ ...prev, ...updates }))}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <PaymentStep 
            expert={expert}
            bookingData={bookingData}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}

// Date selection component
function DateSelection({ 
  expertId, 
  selectedDate, 
  onDateSelect 
}: { 
  expertId: string; 
  selectedDate: string; 
  onDateSelect: (date: string) => void; 
}) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    // Generate next 14 days
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    setAvailableDates(dates);
  }, []);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Select Date</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableDates.map((date) => {
          const dateObj = new Date(date);
          const isToday = date === new Date().toISOString().split('T')[0];
          const isPast = dateObj < new Date();
          
          return (
            <button
              key={date}
              disabled={isPast}
              onClick={() => onDateSelect(date)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                isPast 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : selectedDate === date
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <div className="font-medium">
                {isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-sm">
                {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Time selection component
function TimeSelection({ 
  expertId, 
  selectedDate, 
  selectedTime, 
  duration,
  userTimezone,
  onTimeSelect, 
  onDurationChange,
  onBack 
}: { 
  expertId: string; 
  selectedDate: string; 
  selectedTime: string; 
  duration: number;
  userTimezone: string;
  onTimeSelect: (time: string, utcTime: string) => void; 
  onDurationChange: (duration: number) => void;
  onBack: () => void; 
}) {
  const { data: timeSlots, isLoading } = useQuery({
    queryKey: ['timeSlots', expertId, selectedDate, userTimezone],
    queryFn: async () => {
      const response = await fetch(`/api/experts/${expertId}/available-slots/${selectedDate}?timezone=${encodeURIComponent(userTimezone)}`);
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!selectedDate
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading available times...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Select Time</h3>
        <button 
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to dates
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Session Duration</label>
        <select 
          value={duration}
          onChange={(e) => onDurationChange(parseInt(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>
      </div>

      {timeSlots && timeSlots.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {timeSlots.slice(0, 12).map((slot: any) => {
            // Handle both old format (string) and new format (object with timezone info)
            const isNewFormat = typeof slot === 'object' && slot.displayTime;
            const displayTime = isNewFormat ? slot.displayTime : new Date(slot).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
            const slotKey = isNewFormat ? slot.utcTime : slot;
            const timeValue = isNewFormat ? slot.time : slot;
            const utcTime = isNewFormat ? slot.utcTime : slot;
            
            return (
              <button
                key={slotKey}
                onClick={() => onTimeSelect(timeValue, utcTime)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedTime === timeValue
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="font-medium">{displayTime}</div>
                {isNewFormat && (
                  <div className="text-xs text-gray-500 mt-1">
                    Your time
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No available time slots for this date. Please select another date.
        </div>
      )}
    </div>
  );
}

// Booking details component
function BookingDetails({ 
  data, 
  onChange, 
  onNext, 
  onBack 
}: { 
  data: any; 
  onChange: (updates: any) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const canProceed = data.clientName && data.clientEmail;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Details</h3>
        <button 
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to times
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name *</label>
          <input 
            type="text"
            value={data.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email Address *</label>
          <input 
            type="email"
            value={data.clientEmail}
            onChange={(e) => onChange({ clientEmail: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Enter your email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
          <textarea 
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
            placeholder="Anything you'd like the expert to know before your consultation?"
          />
        </div>

        <button 
          onClick={onNext}
          disabled={!canProceed}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            canProceed 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}

// Payment component
function PaymentStep({ 
  expert, 
  bookingData, 
  onBack 
}: { 
  expert: Expert; 
  bookingData: any; 
  onBack: () => void; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, navigate] = useLocation();

  const totalAmount = (expert.hourlyRate * bookingData.duration / 60);

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!stripe || !elements) throw new Error('Stripe not loaded');

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Create appointment booking
      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: expert.id,
          clientName: bookingData.clientName,
          clientEmail: bookingData.clientEmail,
          scheduledAt: bookingData.utcTime || bookingData.time, // Use UTC time if available
          scheduledAtTimezone: bookingData.timezone,
          duration: bookingData.duration,
          notes: bookingData.notes,
          totalAmount: Math.round(totalAmount * 100) // Convert to cents
        })
      });

      if (!response.ok) throw new Error('Failed to create booking');
      const { clientSecret, appointmentId } = await response.json();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: bookingData.clientName,
            email: bookingData.clientEmail
          }
        }
      });

      if (error) throw error;

      // Confirm the appointment
      await fetch(`/api/appointments/${appointmentId}/confirm`, {
        method: 'POST'
      });

      return { appointmentId, paymentIntent };
    },
    onSuccess: (data) => {
      navigate(`/appointment-confirmation/${data.appointmentId}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      await bookingMutation.mutateAsync();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Payment</h3>
        <button 
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to details
        </button>
      </div>

      {/* Booking summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium mb-2">Booking Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(bookingData.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <div className="text-right">
              <div>
                {bookingData.utcTime 
                  ? new Date(bookingData.utcTime).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true,
                      timeZone: bookingData.timezone 
                    })
                  : new Date(bookingData.time).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })
                }
              </div>
              <div className="text-xs text-gray-500">
                {bookingData.timezone}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{bookingData.duration} minutes</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Card Information</label>
          <div className="border border-gray-300 rounded-md p-3">
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
                },
              }}
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={!stripe || isProcessing || bookingMutation.isPending}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isProcessing || bookingMutation.isPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isProcessing || bookingMutation.isPending ? (
            'Processing...'
          ) : (
            `Pay $${totalAmount.toFixed(2)} & Book Consultation`
          )}
        </button>

        {bookingMutation.error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            {bookingMutation.error.message}
          </div>
        )}
      </form>
    </div>
  );
}