import React, { useState } from "react";
import { Mail, Loader2, Check, AlertCircle } from "lucide-react";

interface EmailAnswerFormProps {
  question: string;
  answer: string;
  onEmailSent?: () => void;
}

export function EmailAnswerForm({
  question,
  answer,
  onEmailSent,
}: EmailAnswerFormProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !email.trim()) {
      setErrorMessage("Please fill in all fields");
      setStatus("error");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setErrorMessage("Please enter a valid email address");
      setStatus("error");
      return;
    }

    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/email-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          question: question.trim(),
          answer: answer.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send email");
      }

      setStatus("success");
      setFirstName("");
      setEmail("");
      onEmailSent?.();
    } catch (error) {
      console.error("Email sending error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send email",
      );
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <h3 className="text-green-800 font-medium">
              Email sent successfully!
            </h3>
            <p className="text-green-700 text-sm mt-1">
              The answer has been sent to your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Mail className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-blue-900 font-medium">
          AskEdith Please Email me this answer
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your first name"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email address"
            disabled={isLoading}
            required
          />
        </div>

        {status === "error" && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !firstName.trim() || !email.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            "Please Send"
          )}
        </button>
      </form>
    </div>
  );
}
