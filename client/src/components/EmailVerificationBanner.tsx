import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, X } from "lucide-react";

interface EmailVerificationBannerProps {
  email: string;
}

export default function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const resendVerificationMutation = useMutation({
    mutationFn: () => apiRequest("/api/request-verification", "POST"),
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: `We've sent a verification email to ${email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  if (!isVisible) return null;

  return (
    <Alert className="bg-amber-50 border-amber-200 mb-4">
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="text-amber-800">
            Please verify your email address to access all features.
          </span>
          <Button
            variant="link"
            className="text-amber-700 hover:text-amber-800 px-2"
            onClick={() => resendVerificationMutation.mutate()}
            disabled={resendVerificationMutation.isPending}
          >
            {resendVerificationMutation.isPending ? "Sending..." : "Resend verification email"}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-600 hover:text-amber-700"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}