import { useState } from "react";
import { X, Shield, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

export default function SignupModal({ open, onClose }: SignupModalProps) {
  const { registerMutation } = useAuth();
  const [isProfessional, setIsProfessional] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    communityName: "",
    city: "",
    state: "",
    introduction: "",
    premiumSelected: false,
    termsAccepted: false,
    // Professional fields
    company: "",
    companyWebsite: "",
    companyPhone: "",
    profession: "",
    licenseNumber: "",
    associationMembership: "",
    // Appointment booking fields
    allowBooking: false,
    calendlyLink: "",
  });

  const handleSignup = () => {
    if (!formData.termsAccepted) {
      // toast is handled in useAuth hook
      return;
    }

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password ||
      !formData.communityName
    ) {
      // toast is handled in useAuth hook
      return;
    }

    registerMutation.mutate(
      {
        username: formData.communityName,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        communityName: formData.communityName,
        city: formData.city,
        state: formData.state,
        introduction: formData.introduction,
        defaultProfileType: isProfessional ? "tree" : "daisy",
        role: isProfessional ? "expert" : "user",
      },
      {
        onSuccess: () => {
          onClose(); // Close modal on success, redirect is handled in useAuth
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignup();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Join Our Caring Community
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Create your account and start connecting with fellow caregivers
            today.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          {/* Professional Signup Toggle */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="professional"
                checked={isProfessional}
                onCheckedChange={(checked) =>
                  setIsProfessional(checked as boolean)
                }
                className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
              />
              <div>
                <Label
                  htmlFor="professional"
                  className="text-sm font-medium text-teal-800 cursor-pointer"
                >
                  I'm a healthcare or eldercare professional
                </Label>
                <p className="text-xs text-teal-600 mt-1">
                  Join as a verified expert with consultation capabilities ($100
                  verification fee)
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-gray-700"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Sarah"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-gray-700"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Johnson"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="communityName"
              className="text-sm font-medium text-gray-700"
            >
              Your Community Name
            </Label>
            <Input
              id="communityName"
              type="text"
              placeholder="Choose a name others will see (e.g., CaringDaughter, Portland_Helper)"
              value={formData.communityName}
              onChange={(e) =>
                handleInputChange("communityName", e.target.value)
              }
              className="mt-1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This name keeps your identity private while connecting with the
              community
            </p>
          </div>

          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="sarah@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Create Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label
                htmlFor="city"
                className="text-sm font-medium text-gray-700"
              >
                City
              </Label>
              <Input
                id="city"
                type="text"
                placeholder="Portland"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label
                htmlFor="state"
                className="text-sm font-medium text-gray-700"
              >
                State
              </Label>
              <Select
                onValueChange={(value) => handleInputChange("state", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Professional Fields - Only show when isProfessional is true */}
          {isProfessional && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold text-amber-800 mb-4">
                Professional Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="company"
                    className="text-sm font-medium text-gray-700"
                  >
                    Company/Organization
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Compassionate Care Services"
                    value={formData.company}
                    onChange={(e) =>
                      handleInputChange("company", e.target.value)
                    }
                    className="mt-1"
                    required={isProfessional}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="companyWebsite"
                    className="text-sm font-medium text-gray-700"
                  >
                    Company Website
                  </Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    placeholder="https://www.yourcompany.com"
                    value={formData.companyWebsite}
                    onChange={(e) =>
                      handleInputChange("companyWebsite", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="companyPhone"
                  className="text-sm font-medium text-gray-700"
                >
                  Company Phone
                </Label>
                <Input
                  id="companyPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.companyPhone}
                  onChange={(e) =>
                    handleInputChange("companyPhone", e.target.value)
                  }
                  className="mt-1"
                  required={isProfessional}
                />
              </div>

              <div>
                <Label
                  htmlFor="profession"
                  className="text-sm font-medium text-gray-700"
                >
                  Profession
                </Label>
                <Select
                  onValueChange={(value) =>
                    handleInputChange("profession", value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your profession" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home-care-professional">
                      Home Care Professional
                    </SelectItem>
                    <SelectItem value="elder-law-attorney">
                      Elder Law Attorney
                    </SelectItem>
                    <SelectItem value="geriatrician">Geriatrician</SelectItem>
                    <SelectItem value="registered-nurse">
                      Registered Nurse
                    </SelectItem>
                    <SelectItem value="social-worker">Social Worker</SelectItem>
                    <SelectItem value="physical-therapist">
                      Physical Therapist
                    </SelectItem>
                    <SelectItem value="occupational-therapist">
                      Occupational Therapist
                    </SelectItem>
                    <SelectItem value="financial-advisor">
                      Financial Advisor
                    </SelectItem>
                    <SelectItem value="care-manager">Care Manager</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="licenseNumber"
                    className="text-sm font-medium text-gray-700"
                  >
                    License Number (if applicable)
                  </Label>
                  <Input
                    id="licenseNumber"
                    type="text"
                    placeholder="License #123456"
                    value={formData.licenseNumber}
                    onChange={(e) =>
                      handleInputChange("licenseNumber", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="associationMembership"
                    className="text-sm font-medium text-gray-700"
                  >
                    Professional Association
                  </Label>
                  <Input
                    id="associationMembership"
                    type="text"
                    placeholder="National Association of..."
                    value={formData.associationMembership}
                    onChange={(e) =>
                      handleInputChange("associationMembership", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Appointment Booking Settings */}
              <div className="space-y-4 pt-4 border-t border-amber-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="allowBooking"
                    checked={formData.allowBooking}
                    onCheckedChange={(checked) =>
                      handleInputChange("allowBooking", checked as boolean)
                    }
                    className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-1"
                    data-testid="checkbox-allow-booking"
                  />
                  <div>
                    <Label
                      htmlFor="allowBooking"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Allow appointment booking after verification
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Enable clients to book paid consultation sessions with you
                    </p>
                  </div>
                </div>

                {formData.allowBooking && (
                  <div>
                    <Label
                      htmlFor="calendlyLink"
                      className="text-sm font-medium text-gray-700"
                    >
                      Calendly Link
                    </Label>
                    <Input
                      id="calendlyLink"
                      type="url"
                      placeholder="https://calendly.com/your-username"
                      value={formData.calendlyLink}
                      onChange={(e) =>
                        handleInputChange("calendlyLink", e.target.value)
                      }
                      className="mt-1"
                      data-testid="input-calendly-link"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your Calendly link for appointment scheduling (set up your Calendly account separately)
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-amber-100 border border-amber-300 rounded p-3 mt-4">
                <p className="text-sm text-amber-800">
                  <strong>Professional Verification:</strong> A $100
                  verification fee will be required to confirm your credentials
                  and enable consultation features.
                </p>
              </div>
            </div>
          )}

          <div>
            <Label
              htmlFor="introduction"
              className="text-sm font-medium text-gray-700"
            >
              What brings you to our community? (Optional)
            </Label>
            <Textarea
              id="introduction"
              placeholder="Share a bit about your caregiving journey..."
              value={formData.introduction}
              onChange={(e) =>
                handleInputChange("introduction", e.target.value)
              }
              className="mt-1 h-24"
            />
          </div>

          {/* <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <Crown className="w-4 h-4 mr-2 text-teal-600" />
              Premium Membership ($9.99/month)
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-teal-500" />
                Priority support responses
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-teal-500" />
                Access to expert-only discussions
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-teal-500" />
                Monthly virtual support groups
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-teal-500" />
                Ad-free experience
              </li>
            </ul>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="premium"
                checked={formData.premiumSelected}
                onCheckedChange={(checked) => handleInputChange("premiumSelected", checked as boolean)}
                className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
              />
              <Label htmlFor="premium" className="text-sm font-medium text-gray-700">
                Add Premium Membership
              </Label>
            </div>
          </div> */}

          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) =>
                handleInputChange("termsAccepted", checked as boolean)
              }
              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
              required
            />
            <Label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the{" "}
              <a href="#" className="text-teal-600 hover:underline">
                Community Guidelines
              </a>{" "}
              and{" "}
              <a href="#" className="text-teal-600 hover:underline">
                Privacy Policy
              </a>
            </Label>
          </div>

          <div className="mt-8 mb-4">
            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 text-lg font-bold border-2 border-teal-800 shadow-xl"
              style={{ minHeight: "56px" }}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? "Joining..."
                : isProfessional
                  ? "Continue to Professional Verification"
                  : "Join Your Community"}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => (window.location.href = "/auth")}
              className="text-teal-600 hover:underline"
            >
              Sign in here
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
