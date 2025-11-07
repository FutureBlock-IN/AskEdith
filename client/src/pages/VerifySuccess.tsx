import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function VerifySuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Email Verified!</CardTitle>
          <CardDescription className="mt-2">
            Your email has been successfully verified. You now have full access to all features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Thank you for verifying your email. You can now participate fully in our community, 
            book consultations with experts, and access all platform features.
          </p>
          <Link href="/community">
            <Button className="w-full">Go to Community</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">View Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}