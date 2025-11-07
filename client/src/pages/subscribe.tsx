import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, Crown, Check, Star, Users, MessageCircle, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
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
        return_url: `${window.location.origin}/?subscription=success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Premium!",
        description: "Your subscription has been activated. Enjoy exclusive benefits!",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <PaymentElement />
      </div>
      <Button 
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
      >
        {isProcessing ? "Processing..." : "Subscribe Now - $9.99/month"}
      </Button>
      <p className="text-xs text-gray-500 text-center">
        Cancel anytime. No long-term commitments.
      </p>
    </form>
  );
};

export default function Subscribe() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/get-or-create-subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          toast({
            title: "Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        console.error("Subscription error:", error);
        toast({
          title: "Error",
          description: "Failed to create subscription. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAuthenticated, toast]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Crown className="w-16 h-16 text-purple-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Sign in to Subscribe
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Join our community first to access premium features.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (user?.isPremium) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              You're Already Premium! 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for supporting our community. Enjoy all the exclusive benefits!
            </p>
            <Link href="/">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Setting up your subscription...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Unable to Process Subscription
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              We're experiencing technical difficulties. Please try again later.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
            </Link>
          </div>
          
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to <span className="text-teal-600">Premium</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get exclusive access to expert discussions, priority support, and a completely ad-free experience.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Premium Benefits */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Premium Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Priority Expert Responses</h3>
                      <p className="text-gray-600 text-sm">Your questions get answered first by verified healthcare professionals.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Exclusive Expert Discussions</h3>
                      <p className="text-gray-600 text-sm">Access to premium-only discussions with healthcare experts and specialists.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Monthly Virtual Support Groups</h3>
                      <p className="text-gray-600 text-sm">Join intimate video calls with other premium members for deeper support.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Ad-Free Experience</h3>
                      <p className="text-gray-600 text-sm">Enjoy a clean, distraction-free community experience.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Premium Badge</h3>
                      <p className="text-gray-600 text-sm">Show your commitment to the community with a special premium badge.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Early Access to Features</h3>
                      <p className="text-gray-600 text-sm">Be the first to try new community features and improvements.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Supporting Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Your premium membership helps us maintain a safe, supportive environment for all caregivers. 
                  100% of proceeds go toward community moderation, expert verification, and platform improvements.
                </p>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-teal-900">Community Impact</span>
                  </div>
                  <ul className="text-sm text-teal-800 space-y-1">
                    <li>• Fund expert verification and moderation</li>
                    <li>• Keep the platform ad-free for free members</li>
                    <li>• Develop new safety and support features</li>
                    <li>• Host community events and resources</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Form */}
          <div className="lg:sticky lg:top-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  Complete Your Subscription
                </CardTitle>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">$9.99</div>
                  <div className="text-gray-500">per month</div>
                  <Badge variant="secondary" className="mt-2">Cancel anytime</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0f766e', // teal-600
                    }
                  }
                }}>
                  <SubscribeForm />
                </Elements>
              </CardContent>
            </Card>

            {/* Testimonial */}
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <img 
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" 
                    alt="Premium member testimonial" 
                    className="w-12 h-12 rounded-full object-cover" 
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">Linda K.</span>
                      <Badge variant="outline" className="text-purple-600 border-purple-600">Premium Member</Badge>
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      "The expert discussions alone are worth the subscription. Having direct access to healthcare professionals who understand caregiving has been invaluable."
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
