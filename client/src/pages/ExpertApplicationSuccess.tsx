import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ExpertApplicationSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  // Get session ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  const completeApplicationMutation = useMutation({
    mutationFn: async () => {
      const savedData = localStorage.getItem('expertApplicationData');
      if (!savedData || !sessionId) {
        throw new Error('Missing application data or session ID');
      }

      const applicationData = JSON.parse(savedData);
      
      const response = await apiRequest("POST", "/api/experts/complete-checkout-application", {
        sessionId,
        applicationData
      });

      localStorage.removeItem('expertApplicationData');
      return response;
    },
    onSuccess: () => {
      setIsProcessing(false);
      toast({
        title: "Application Submitted",
        description: "Your expert verification application has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to complete application. Please contact support.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (sessionId) {
      completeApplicationMutation.mutate();
    } else {
      setIsProcessing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // Redirect to community after 10 seconds
    const timer = setTimeout(() => {
      setLocation("/community");
    }, 10000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
            <CardTitle className="text-2xl">Application Submitted Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thank you for applying to become a verified expert. Your application and payment have been received successfully.
            </p>
            <p className="text-gray-600">
              Our team will review your application within 2-3 business days. You'll receive an email notification once your verification is complete.
            </p>
            <div className="pt-4 space-y-3">
              <Button onClick={() => setLocation("/community")} className="w-full">
                Explore Community
              </Button>
              <Button onClick={() => setLocation("/dashboard")} variant="outline" className="w-full">
                Return to Dashboard
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              You will be automatically redirected to the community in 10 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}