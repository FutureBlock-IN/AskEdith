import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, useUser } from "@clerk/clerk-react";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/Dashboard";
import Category from "@/pages/category";
import Post from "@/pages/post";
import Topic from "@/pages/topic";
import Subscribe from "@/pages/subscribe";
import ExpertDirectory from "@/pages/ExpertDirectory";
import ExpertProfile from "@/pages/ExpertProfile";
import ExpertApplication from "@/pages/ExpertApplication";
import ExpertApplicationWithPayment from "@/pages/ExpertApplicationWithPayment";
import ExpertApplicationWithPaymentTest from "@/pages/ExpertApplicationWithPaymentTest";
import ExpertApplicationPaymentFixed from "@/pages/ExpertApplicationPaymentFixed";
import ExpertApplicationSuccess from "@/pages/ExpertApplicationSuccess";
import ExpertApplicationSimple from "@/pages/ExpertApplicationSimple";
import BookConsultation from "@/pages/BookConsultationNew";
import MyBookings from "@/pages/MyBookings";
import BookAppointment from "@/pages/BookAppointment";
import ThisWeekBy from "@/pages/ThisWeekBy";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifySuccess from "@/pages/VerifySuccess";

import AdminDashboard from "@/pages/AdminDashboard";
import AdminContentSources from "@/pages/AdminContentSources";
import AdminSearchLogs from "@/pages/AdminSearchLogs";
import AdminSocialMediaEmbeds from "@/pages/admin/SocialMediaEmbeds";
import RagAdmin from "@/pages/admin/RagAdmin";
import FoundersLetter from "@/pages/FoundersLetter";
import ExpertAvailability from "@/pages/ExpertAvailability";
import RagSearchPage from "@/pages/RagSearchPage";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { user, isLoaded } = useUser();
  const { needsOnboarding, isLoading: authLoading } = useAuth();

  // Only show loading for authenticated users who are still loading
  // Allow unauthenticated users to access public pages immediately
  if (user && authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // If user is authenticated but needs onboarding, redirect to onboarding
  if (user && needsOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OnboardingPage />
      </div>
    );
  }

  // Removed the automatic redirect for pending expert applicants - they can now navigate freely

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Switch>
        <Route path="/" component={user ? Home : Landing} />
        <Route path="/landing" component={Landing} />
        <Route path="/community" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/topic" component={Topic} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/post/:id" component={Post} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-success" component={VerifySuccess} />
        <Route path="/expert/apply" component={ExpertApplication} />
        <Route path="/expert/apply-with-payment" component={ExpertApplicationWithPayment} />
        <Route path="/expert-application-with-payment" component={ExpertApplicationWithPayment} />
        <Route path="/expert-application-with-payment-test" component={ExpertApplicationWithPaymentTest} />
        <Route path="/expert-application-payment-fixed" component={ExpertApplicationPaymentFixed} />
        <Route path="/expert-application-simple" component={ExpertApplicationSimple} />
        <Route path="/expert-application/success" component={ExpertApplicationSuccess} />
        <Route path="/expert-application-success" component={ExpertApplicationSuccess} />
        <Route path="/experts" component={ExpertDirectory} />
        <Route path="/expert/:userId" component={ExpertProfile} />

        <Route path="/profile/:id" component={ProfilePage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/book-consultation/:expertId" component={BookConsultation} />
        <Route path="/my-bookings" component={MyBookings} />
        <Route path="/book/:expertId" component={BookAppointment} />
        <Route path="/this-week-by" component={ThisWeekBy} />
        <Route path="/founders-letter" component={FoundersLetter} />
        <Route path="/expert/availability" component={ExpertAvailability} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/content-sources" component={AdminContentSources} />
        <Route path="/admin/search-logs" component={AdminSearchLogs} />
        <Route path="/admin/social-media-embeds" component={AdminSocialMediaEmbeds} />
        <Route path="/admin/rag" component={RagAdmin} />
        <Route path="/ai-search" component={RagSearchPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Error page component for missing configuration
function ConfigurationError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Configuration Required</h1>
          <p className="text-lg text-gray-600 mb-6">Missing Clerk authentication keys. The application cannot start without proper configuration.</p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-left">
            <h2 className="font-semibold text-red-900 mb-3">Missing Environment Variable:</h2>
            <code className="block bg-red-100 text-red-800 px-3 py-2 rounded font-mono text-sm">
              VITE_CLERK_PUBLISHABLE_KEY
            </code>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left">
            <h2 className="font-semibold text-gray-900 mb-3">To Fix This:</h2>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Copy <code className="bg-gray-200 px-2 py-1 rounded text-sm">.env.example</code> to <code className="bg-gray-200 px-2 py-1 rounded text-sm">.env</code></span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Get your Clerk keys from <a href="https://dashboard.clerk.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">dashboard.clerk.com</a></span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Add the keys to your <code className="bg-gray-200 px-2 py-1 rounded text-sm">.env</code> file</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>Restart the development server</span>
              </li>
            </ol>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <p>For detailed setup instructions, see <code className="bg-gray-200 px-2 py-1 rounded">SETUP_GUIDE.md</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Show helpful error page if Clerk keys are missing
  if (!clerkPubKey) {
    console.error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
    console.error("Please see SETUP_GUIDE.md for setup instructions");
    return <ConfigurationError />;
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#487d7a"
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ScrollToTop />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
