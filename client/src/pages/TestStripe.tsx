import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function TestStripe() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testStripePayment = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/consultations/create-payment", {
        expertId: "expert_002",
        duration: 60,
        totalAmount: 15000, // $150.00
      });
      
      setResult(response);
      toast({
        title: "Success",
        description: "Payment intent created successfully!",
      });
    } catch (error: any) {
      console.error("Test failed:", error);
      setResult({ error: error.message });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Test Stripe Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Click the button below to test creating a Stripe payment intent.
              </p>
              <Button 
                onClick={testStripePayment} 
                disabled={loading}
                size="lg"
              >
                {loading ? "Testing..." : "Test Payment Intent"}
              </Button>
            </div>
            
            {result && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold mb-2">Result:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}