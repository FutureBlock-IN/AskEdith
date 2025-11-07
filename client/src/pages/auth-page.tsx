import {
  SignIn,
  SignUp,
  useUser,
  SignedOut,
  SignedIn,
} from "@clerk/clerk-react";
import { useState } from "react";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Users, Shield, Star } from "lucide-react";

export default function AuthPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already authenticated
  if (isLoaded && isSignedIn) {
    return <Redirect to="/" />;
  }

  // Show loading spinner while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left side - Hero content */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                Welcome to <span className="text-teal-600">AskEdith</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Your compassionate community for family caregivers. Get expert
                advice, share experiences, and find the support you need.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-3">
                  <Heart className="h-6 w-6 text-teal-600 mr-3" />
                  <h3 className="font-semibold text-gray-800">
                    Expert Guidance
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Connect with verified healthcare professionals and caregiving
                  experts
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-3">
                  <Users className="h-6 w-6 text-teal-600 mr-3" />
                  <h3 className="font-semibold text-gray-800">
                    Supportive Community
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Share experiences with other family caregivers who understand
                  your journey
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-3">
                  <Shield className="h-6 w-6 text-teal-600 mr-3" />
                  <h3 className="font-semibold text-gray-800">
                    Safe & Private
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Your privacy is protected with secure, confidential
                  discussions
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-3">
                  <Star className="h-6 w-6 text-teal-600 mr-3" />
                  <h3 className="font-semibold text-gray-800">
                    Trusted Resources
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Access curated resources and evidence-based caregiving
                  information
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Clerk Auth components */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Join AskEdith
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Create your account or sign in to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignedOut>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="login" data-testid="tab-signin">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="register" data-testid="tab-signup">
                        Join Now
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                      <div
                        className="flex justify-center"
                        data-testid="clerk-signin-container"
                      >
                        <SignIn
                          fallbackRedirectUrl="/"
                          signUpUrl="/auth"
                          appearance={{
                            elements: {
                              formButtonPrimary:
                                "bg-teal-600 hover:bg-teal-700 text-white",
                              card: "shadow-none border-0 w-full",
                              headerTitle: "hidden",
                              headerSubtitle: "hidden",
                              socialButtonsBlockButton:
                                "border border-gray-300 text-gray-700 hover:bg-gray-50 w-full mb-2",
                              socialButtonsBlockButtonText: "text-gray-700",
                              formFieldInput:
                                "border-gray-300 focus:border-teal-500 focus:ring-teal-500",
                              footerActionLink:
                                "text-teal-600 hover:text-teal-700",
                              dividerLine: "bg-gray-200",
                              dividerText: "text-gray-500",
                              socialButtonsProviderIcon: "w-4 h-4",
                            },
                            layout: {
                              socialButtonsPlacement: "top",
                              showOptionalFields: false,
                            },
                          }}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="register">
                      <div
                        className="flex justify-center"
                        data-testid="clerk-signup-container"
                      >
                        <SignUp
                          fallbackRedirectUrl="/"
                          signInUrl="/auth"
                          appearance={{
                            elements: {
                              formButtonPrimary:
                                "bg-teal-600 hover:bg-teal-700 text-white",
                              card: "shadow-none border-0 w-full",
                              headerTitle: "hidden",
                              headerSubtitle: "hidden",
                              socialButtonsBlockButton:
                                "border border-gray-300 text-gray-700 hover:bg-gray-50 w-full mb-2",
                              socialButtonsBlockButtonText: "text-gray-700",
                              formFieldInput:
                                "border-gray-300 focus:border-teal-500 focus:ring-teal-500",
                              footerActionLink:
                                "text-teal-600 hover:text-teal-700",
                              dividerLine: "bg-gray-200",
                              dividerText: "text-gray-500",
                              socialButtonsProviderIcon: "w-4 h-4",
                            },
                            layout: {
                              socialButtonsPlacement: "top",
                              showOptionalFields: false,
                            },
                          }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </SignedOut>

                <SignedIn>
                  <div className="text-center">
                    <p className="text-gray-600">You are already signed in!</p>
                    <Redirect to="/" />
                  </div>
                </SignedIn>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}