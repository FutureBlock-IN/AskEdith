import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, Users, Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Schema for onboarding form - required fields based on user requirements
const onboardingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  communityName: z.string().min(1, "Community name is required"),
  username: z.string().min(1, "Username is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  timezone: z.string().optional(),
  introduction: z.string().optional(),
  isProfessional: z.boolean().default(false),
  // Professional fields - conditional validation
  company: z.string().optional(),
  companyWebsite: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  companyPhone: z.string().optional(),
  profession: z.string().optional(),
  licenseNumber: z.string().optional(),
  professionalAssociation: z.string().optional(),
  // Appointment booking fields
  allowBooking: z.boolean().default(false),
  calendlyLink: z.string().url("Please enter a valid Calendly URL").optional().or(z.literal("")),
  consultationRate: z.string().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation: if user is professional, require professional fields
  if (data.isProfessional) {
    if (!data.company || data.company.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company/Organization is required for professionals",
        path: ["company"],
      });
    }
    if (!data.profession || data.profession.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Profession is required for professionals",
        path: ["profession"],
      });
    }
    if (data.companyWebsite && data.companyWebsite.trim() !== "") {
      try {
        new URL(data.companyWebsite);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid website URL",
          path: ["companyWebsite"],
        });
      }
    }
    
    // Validate Calendly link if appointment booking is enabled
    if (data.allowBooking && (!data.calendlyLink || data.calendlyLink.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Calendly link is required when appointment booking is enabled",
        path: ["calendlyLink"],
      });
    }
    
    if (data.calendlyLink && data.calendlyLink.trim() !== "") {
      const trimmedLink = data.calendlyLink.trim();
      if (!trimmedLink.startsWith("https://calendly.com/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid Calendly URL (must start with https://calendly.com/)",
          path: ["calendlyLink"],
        });
      }
    }

    // Validate consultation rate if appointment booking is enabled
    if (data.allowBooking && (!data.consultationRate || data.consultationRate.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hourly consultation rate is required when appointment booking is enabled",
        path: ["consultationRate"],
      });
    }

    if (data.consultationRate && data.consultationRate.trim() !== "") {
      const rate = parseFloat(data.consultationRate.trim());
      if (isNaN(rate) || rate < 50 || rate > 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Consultation rate must be between $50 and $500",
          path: ["consultationRate"],
        });
      }
    }
  }
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

// Professional options for the dropdown
const PROFESSIONS = [
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Certified Nursing Assistant (CNA)",
  "Social Worker",
  "Physical Therapist",
  "Occupational Therapist",
  "Home Health Aide",
  "Case Manager",
  "Geriatrician",
  "Psychologist",
  "Counselor",
  "Elder Law Attorney",
  "Financial Planner",
  "Other Healthcare Professional",
  "Other Eldercare Professional"
];

// US States for the dropdown
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export default function OnboardingPage() {
  const { user: clerkUser } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProfessional, setIsProfessional] = useState(false);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: clerkUser?.firstName || "",
      lastName: clerkUser?.lastName || "",
      communityName: "",
      username: clerkUser?.username || "",
      city: "",
      state: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      introduction: "",
      isProfessional: false,
      company: "",
      companyWebsite: "",
      companyPhone: "",
      profession: "",
      licenseNumber: "",
      professionalAssociation: "",
      allowBooking: false,
      calendlyLink: "",
      consultationRate: "",
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
      return await apiRequest("POST", "/api/complete-profile", data);
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Welcome to CaregiversCommunity!",
        description: "Your profile has been completed successfully.",
      });
      // Update both query caches and redirect
      queryClient.setQueryData(["/api/user"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/profile-complete"] });
      setLocation("/"); // Redirect to home after completion
    },
    onError: (error: any) => {
      toast({
        title: "Profile completion failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OnboardingForm) => {
    completeProfileMutation.mutate(data);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-teal-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Welcome to AskEdith!
          </CardTitle>
          <CardDescription className="text-lg">
            Help us personalize your experience by completing your profile
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            {...field}
                            data-testid="input-firstname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            {...field}
                            data-testid="input-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="communityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Community Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Choose a name others will see (e.g., CaringDaughter, Portland)"
                          {...field}
                          data-testid="input-community-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email Address
                  </label>
                  <Input
                    value={clerkUser?.emailAddresses?.[0]?.emailAddress || ""}
                    readOnly
                    disabled
                    className="bg-gray-100"
                    data-testid="input-email"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your unique username"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Location</h3>
                  <span className="text-sm text-gray-500">Helps connect you with local resources</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Portland"
                            {...field}
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Introduction */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="introduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What brings you to our community? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share a bit about your caregiving journey..."
                          className="resize-none"
                          rows={4}
                          {...field}
                          data-testid="textarea-introduction"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Professional Checkbox */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isProfessional"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-teal-200 bg-teal-50 p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            setIsProfessional(!!checked);
                          }}
                          data-testid="checkbox-professional"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium text-teal-800">
                          I'm a healthcare or eldercare professional
                        </FormLabel>
                        <p className="text-xs text-teal-600">
                          Join as a verified expert with consultation capabilities ($100 verification fee)
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Professional Information - Only shown when checkbox is checked */}
              {isProfessional && (
                <div className="space-y-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-orange-800">Professional Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company/Organization</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Compassionate Care Services"
                              {...field}
                              data-testid="input-company"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyWebsite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Website</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://www.yourcompany.com"
                              {...field}
                              data-testid="input-company-website"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(555) 123-4567"
                            {...field}
                            data-testid="input-company-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-profession">
                              <SelectValue placeholder="Select your profession" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROFESSIONS.map((profession) => (
                              <SelectItem key={profession} value={profession}>
                                {profession}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number (if applicable)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="License #123456"
                              {...field}
                              data-testid="input-license-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professionalAssociation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Association</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="National Association of..."
                              {...field}
                              data-testid="input-professional-association"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Appointment Booking Settings */}
                  <div className="space-y-4 pt-4 border-t border-orange-300">
                    <FormField
                      control={form.control}
                      name="allowBooking"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-1"
                              data-testid="checkbox-allow-booking-onboarding"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Allow appointment booking after verification
                            </FormLabel>
                            <p className="text-xs text-gray-500">
                              Enable clients to book paid consultation sessions with you
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch('allowBooking') && (
                      <>
                        <FormField
                          control={form.control}
                          name="calendlyLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Calendly Link
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Your Calendly link for appointment scheduling (set up your Calendly account separately)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://calendly.com/your-username"
                                  {...field}
                                  data-testid="input-calendly-link-onboarding"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="consultationRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hourly Consultation Rate (USD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="150"
                                  min="50"
                                  max="500"
                                  {...field}
                                  data-testid="input-consultation-rate"
                                />
                              </FormControl>
                              <p className="text-xs text-gray-500">
                                Set your hourly rate for consultation sessions ($50-$500)
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  {/* Professional Verification Notice */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Professional Verification
                        </h4>
                        <p className="mt-1 text-sm text-yellow-700">
                          A $100 verification fee will be required to confirm your credentials and enable consultation features.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-6">
                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={completeProfileMutation.isPending}
                  data-testid="button-complete-profile"
                >
                  {completeProfileMutation.isPending ? "Completing..." : "Complete Profile"}
                </Button>

              </div>

              <p className="text-sm text-gray-500 text-center">
                Your email is managed securely by Clerk and cannot be changed here.
                <br />
                Visit your account settings to update email preferences.
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}