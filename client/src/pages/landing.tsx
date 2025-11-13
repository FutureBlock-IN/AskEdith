import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Users,
  MessageSquare,
  Star,
  CheckCircle,
  ArrowRight,
  Clock,
  UserCheck,
  Award,
  Plus,
  Search,
} from "lucide-react";

import SignupModal from "@/components/SignupModal";
import DefaultProfilePicture from "@/components/DefaultProfilePicture";
import CategoryCard from "@/components/CategoryCard";
import { EmailAnswerForm } from "@/components/EmailAnswerForm";
import askEdithHeroImage from "@assets/AskEdith_for_Replit.png";

// Import category images
import governmentImg from "@assets/Government.jpg";
import careAtHomeImg from "@assets/care_at_home.jpg";
import healthCareImg from "@assets/health_care.jpg";
import seniorLivingImg from "@assets/new_senior_living_image.png";
import professionalsImg from "@assets/professionals.jpg";
import payingForCareImg from "@assets/paying_for_care.jpg";
import ReactMarkdown from "react-markdown";

// Map category slugs to images
const categoryImages: Record<string, string> = {
  "government-resources": governmentImg,
  "home-care": careAtHomeImg,
  "hospital-rehab": healthCareImg,
  "family-finances": payingForCareImg,
  professionals: professionalsImg,
  "senior-living": seniorLivingImg,
  "paying-for-care": payingForCareImg,
};

// Animated Counter Component
function AnimatedCounter({
  targetValue,
  categoryId,
}: {
  targetValue: number;
  categoryId: number;
}) {
  const [currentValue, setCurrentValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const duration = 1500; // Animation duration in ms
          const startTime = Date.now();
          const startValue = 0;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const newValue = Math.round(
              startValue + (targetValue - startValue) * easeOutQuart,
            );

            setCurrentValue(newValue);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [targetValue, hasAnimated]);

  return (
    <div ref={elementRef} className="text-center font-medium">
      {currentValue.toLocaleString()}
    </div>
  );
}

export default function Landing() {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const [animatedCounters, setAnimatedCounters] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    question: string;
    paragraphs: string[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleParagraphs, setVisibleParagraphs] = useState<number>(0);
  const [paragraphVisibility, setParagraphVisibility] = useState<{
    [key: number]: boolean;
  }>({});

  // Fetch dynamic search phrases from database
  const { data: searchPhrasesData } = useQuery<{ phrase: string }[]>({
    queryKey: ["/api/search-phrases"],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Extract phrases from API response or fallback to empty array
  const searchPhrases = searchPhrasesData?.map((item) => item.phrase) || [];

  // Fetch community stats
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch categories for preview
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch recent posts for preview
  const { data: recentPosts } = useQuery({
    queryKey: ["/api/posts"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Handle window resize for responsive input height
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Function to get responsive minimum height
  const getResponsiveMinHeight = () => {
    if (windowWidth >= 1024) return "200px"; // lg: screens
    if (windowWidth >= 640) return "180px"; // sm: screens
    return "160px"; // mobile screens
  };

  // Typewriter effect for search placeholder
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isTyping && searchPhrases.length > 0 && !searchResult) {
      const currentPhrase = searchPhrases[currentPhraseIndex];

      if (currentPhrase && displayedText.length < currentPhrase.length) {
        timeoutId = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, 50);
      } else {
        timeoutId = setTimeout(() => {
          setIsTyping(false);
          setDisplayedText("");
          setCurrentPhraseIndex((prev) => (prev + 1) % searchPhrases.length);
          setTimeout(() => setIsTyping(true), 500);
        }, 2500);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    displayedText,
    currentPhraseIndex,
    isTyping,
    searchPhrases,
    searchResult,
  ]);

  // Trigger fade-in for new paragraphs as they arrive
  useEffect(() => {
    if (!searchResult) return;

    // When new paragraphs arrive during streaming, fade them in
    if (searchResult.paragraphs.length > visibleParagraphs) {
      setVisibleParagraphs(searchResult.paragraphs.length);

      // Trigger fade-in for the new paragraph after a short delay
      const newParagraphIndex = searchResult.paragraphs.length - 1;
      setTimeout(() => {
        setParagraphVisibility((prev) => ({
          ...prev,
          [newParagraphIndex]: true,
        }));
      }, 50); // Small delay to ensure DOM is updated
    }
  }, [searchResult?.paragraphs.length, visibleParagraphs]);

  // Handle search with paragraph streaming
  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setIsSearching(true);
      setSearchResult(null);
      setVisibleParagraphs(0);
      setParagraphVisibility({});

      try {
        const response = await fetch("/api/rag-search-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });

        // Response received successfully

        if (!response.ok) {
          throw new Error("Failed to search");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let currentParagraphs: string[] = [];
        let buffer = ""; // Buffer for incomplete chunks
        let lastUpdateTime = 0;
        const UPDATE_THROTTLE = 100; // Update UI at most every 100ms

        if (reader) {
          setSearchResult({
            question: searchQuery,
            paragraphs: [],
          });
          setSearchQuery(""); // Clear search query when starting

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Split by lines but keep incomplete lines in buffer
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep the last (potentially incomplete) line in buffer

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const jsonStr = line.slice(6);
                  // Skip empty lines
                  if (!jsonStr.trim()) continue;

                  // Attempt to parse JSON with better error handling
                  let data;
                  try {
                    data = JSON.parse(jsonStr);
                  } catch (firstParseError) {
                    // If JSON parsing fails, try to clean the string and parse again
                    console.warn(
                      "First JSON parse failed, attempting to clean:",
                      firstParseError,
                    );
                    try {
                      // Replace problematic Unicode characters
                      const cleanedJson = jsonStr
                        .replace(/â€™/g, "'") // Replace smart apostrophe
                        .replace(/â€œ/g, '"') // Replace smart quote open
                        .replace(/â€/g, '"') // Replace smart quote close
                        .replace(/â€"/g, "-") // Replace em dash
                        .replace(/â€"/g, "-"); // Replace en dash
                      data = JSON.parse(cleanedJson);
                    } catch (secondParseError) {
                      console.error(
                        "Failed to parse JSON after cleaning:",
                        secondParseError,
                      );
                      console.error("Original line:", jsonStr);
                      continue; // Skip this line and continue processing
                    }
                  }

                  if (data.type === "heartbeat") {
                    // Heartbeat received - connection established
                    continue;
                  } else if (data.type === "content") {
                    fullContent += data.content;

                    // Real-time streaming: Show content as it comes in

                    // For real-time streaming, always show the current content
                    // Split by paragraphs but also show partial content
                    let displayParagraphs;

                    if (fullContent.includes("\n\n")) {
                      // Try proper paragraph splits first
                      displayParagraphs = fullContent
                        .split("\n\n")
                        .filter((p) => p.trim());
                    } else if (
                      fullContent.includes("\n") &&
                      fullContent.length > 100
                    ) {
                      // Split by single newlines for medium content
                      displayParagraphs = fullContent
                        .split("\n")
                        .filter((p) => p.trim());
                    } else {
                      // Show as single block for short content
                      displayParagraphs = [fullContent.trim()];
                    }

                    // Throttle updates for smoother streaming
                    const now = Date.now();
                    if (
                      fullContent.trim() &&
                      now - lastUpdateTime > UPDATE_THROTTLE
                    ) {
                      lastUpdateTime = now;
                      setSearchResult((prev) =>
                        prev
                          ? {
                              ...prev,
                              paragraphs: displayParagraphs,
                            }
                          : null,
                      );

                      // Show all available paragraphs immediately
                      setVisibleParagraphs(displayParagraphs.length);
                    }
                  } else if (data.type === "error") {
                    throw new Error(data.error || "Streaming error");
                  } else if (data.type === "end") {
                    // Final cleanup - make sure all content is included
                    const finalParagraphs = fullContent
                      .split("\n")
                      .filter((p) => p.trim());
                    if (finalParagraphs.length > 0) {
                      setSearchResult((prev) =>
                        prev
                          ? {
                              ...prev,
                              paragraphs: finalParagraphs,
                            }
                          : null,
                      );
                    }
                    break;
                  }
                } catch (parseError) {
                  console.error("Error parsing streaming data:", parseError);
                  // Continue processing other lines even if one fails
                }
              }
            }
          }

          // Process any remaining buffer content
          if (buffer.trim() && buffer.startsWith("data: ")) {
            try {
              const jsonStr = buffer.slice(6);
              if (jsonStr.trim()) {
                let data;
                try {
                  data = JSON.parse(jsonStr);
                } catch (firstParseError) {
                  console.warn("Final buffer parse failed:", firstParseError);
                  const cleanedJson = jsonStr
                    .replace(/â€™/g, "'")
                    .replace(/â€œ/g, '"')
                    .replace(/â€/g, '"')
                    .replace(/â€"/g, "-")
                    .replace(/â€"/g, "-");
                  data = JSON.parse(cleanedJson);
                }

                // Handle final data chunk (similar logic as above)
                if (data.type === "content") {
                  fullContent += data.content;
                  const finalParagraphs = fullContent
                    .split("\n")
                    .filter((p) => p.trim());
                  if (finalParagraphs.length > 0) {
                    setSearchResult((prev) =>
                      prev
                        ? {
                            ...prev,
                            paragraphs: finalParagraphs,
                          }
                        : null,
                    );
                  }
                }
              }
            } catch (bufferError) {
              console.error("Error processing final buffer:", bufferError);
            }
          }
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResult({
          question: searchQuery,
          paragraphs: [
            "You’ve reached your free prompt limit. Please sign in to continue your conversation and unlock unlimited access.",
          ],
        });
        setSearchQuery(""); // Clear search query after error
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div id="scrollhere" className="min-h-screen bg-gray-50">
      {/* Welcome Hero - Split Screen Design */}
      <section className="relative" style={{ minHeight: "100vh" }}>
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Left Side - Journey Together */}
          <div className="flex-1 flex items-center justify-center bg-[#0B666B] relative min-h-screen pb-12 px-4 sm:px-6 lg:px-8">
            <div
              style={{
                width: "80%",
                maxWidth: "900px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div style={{ marginBottom: "2rem" }}>
                {/* Cache bust: Updated Jan 29 2025 */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight text-center">
                  Journey Together.
                </h1>

                <p className="text-lg sm:text-xl text-white/90 leading-relaxed text-center">
                  AskEdith is your Guide to retirement and caregiving. Share and
                  learn in Forums, access curated News, and consult with Experts
                  for a stronger retirement.
                </p>
              </div>

              <div className="relative w-full sm:w-11/12 lg:w-11/12 mx-auto">
                <Search className="absolute left-4 sm:left-8 top-6 h-8 w-8 sm:h-10 sm:w-10 text-teal-200" />
                <div
                  className="w-full h-full rounded-3xl border-0 bg-white/95 backdrop-blur-sm shadow-lg overflow-hidden"
                  style={{ position: "relative" }}
                >
                  <div className="w-full h-full pl-8 sm:pl-12 pr-8 sm:pr-12 pt-6 pb-6">
                    {!searchResult ? (
                      <textarea
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSearch(e as any);
                            // scroll page to top smoothly
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        disabled={isSearching}
                        placeholder={displayedText}
                        className="w-full min-h-full border-0 bg-transparent focus:outline-none placeholder-gray-500 resize-none text-lg sm:text-2xl"
                        style={{
                          lineHeight: "1.5",
                          minHeight: getResponsiveMinHeight(),
                        }}
                      />
                    ) : (
                      <div className="h-full flex flex-col">
                        <div
                          className="flex-1 overflow-y-auto"
                          style={{
                            scrollbarWidth: "thin",
                            scrollbarColor: "#0B666B30 transparent",
                          }}
                        >
                          <div
                            style={{ fontSize: "1.125em", lineHeight: "1.5" }}
                          >
                            <div className="text-gray-600 mb-4">
                              <span className="font-semibold">
                                Your question:
                              </span>{" "}
                              {searchResult.question}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-600">
                                Answer:
                              </span>
                              <div className="mt-2 prose max-w-none space-y-4 streaming-content">
                                {searchResult.paragraphs.map(
                                  (paragraph, index) => (
                                    <div
                                      key={`paragraph-${index}`}
                                      className="paragraph-fade-in visible"
                                      style={{
                                        fontSize: "1.1rem",
                                        lineHeight: "1.7",
                                        color: "#374151",
                                        marginBottom: "1.5rem",
                                      }}
                                    >
                                      <ReactMarkdown>{paragraph}</ReactMarkdown>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>

                            {/* Email Answer Form - Only show when response is complete */}
                            {!isSearching &&
                              searchResult.paragraphs.length > 0 && (
                                <div className="mt-6">
                                  <EmailAnswerForm
                                    question={searchResult.question}
                                    answer={searchResult.paragraphs.join(
                                      "\n\n",
                                    )}
                                    onEmailSent={() => {
                                      console.log(
                                        "Email sent successfully from landing page",
                                      );
                                    }}
                                  />
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {/* <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSearch(e as any);
                              }
                            }}
                            placeholder="Ask another question..."
                            className="w-full border-0 bg-transparent focus:outline-none placeholder-gray-400 placeholder:font-bold placeholder:text-lg font-bold text-lg"
                            style={{ fontSize: "0.75em" }}
                          /> */}
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault(); // stop default submit/scroll
                                handleSearch(e as any);
                                // keep page from scrolling down
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            }}
                            placeholder="Ask another question..."
                            className="w-full border-0 bg-transparent 
                            focus:outline-none placeholder:text-base text-lg font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isSearching && (
                <div className="mt-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <p className="text-white/80 mt-2">Searching for answers...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - AskEdith Branding */}
          <div
            className="flex-1 flex flex-col items-center justify-center h-full relative overflow-hidden sticky top-0 pt-12 pb-12"
            style={{ backgroundColor: "#fefbed", height: "100vh" }}
          >
            <img
              src={askEdithHeroImage}
              alt="AskEdith"
              className="max-w-full max-h-[70%] object-contain"
              style={{ marginTop: "-10px", clipPath: "inset(10px 0 0 0)" }}
            />
            <h2 className="text-2xl md:text-3xl font-light text-gray-700 mt-4 text-center px-4">
              All Things Retirement. All Things Care.
            </h2>
          </div>
        </div>
      </section>

      {/* Three Key Features */}
      <section id="features" className="py-24 bg-white relative z-10">
        <div className="w-full px-[30px]">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Authentic Stories */}
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white font-bold text-lg bg-[#0B666B]/90">
                Real
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Authentic Stories
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We bring together the nation's foremost experts, bloggers,
                authors, podcasters, and influencers to share their insights and
                experiences on all things retirement and all things caregiving.
              </p>
            </div>

            {/* Always Here */}
            <div className="text-center p-6">
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: "hsl(var(--coral-primary))" }}
              >
                24/7
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Always Here
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Community support around the clock when you need it most.
              </p>
            </div>

            {/* Protected Space */}
            <div className="text-center p-6">
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: "#4A85D6" }}
              >
                Safe
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Protected Space
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Verified community with privacy protection and moderation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Guidelines Banner */}
      <section
        className="py-6"
        style={{ backgroundColor: "hsl(var(--cream-primary))" }}
      >
        <div className="px-[30px]">
          <div
            className="bg-white rounded-2xl p-6 border-l-4"
            style={{ borderColor: "hsl(var(--gold-primary))" }}
          >
            <div className="flex items-start space-x-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: "hsl(var(--gold-primary))" }}
              >
                !
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Community Safety Guidelines
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>
                      All discussions are public and moderated for safety
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4" />
                    <span>
                      Never share personal contact information (emails, phone
                      numbers)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      External links include safety warnings - verify sources
                      before sharing personal information
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Stats - Hidden */}
      {false && <section className="py-16 bg-white">
        <div className="px-[30px] text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Our Growing Community
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#E8D5F3" }}
              >
                <Users className="w-8 h-8" style={{ color: "#8B7ED8" }} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                <AnimatedCounter targetValue={12450} categoryId={1001} />
              </div>
              <div className="text-gray-600">Active Caregivers</div>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#D6E9FF" }}
              >
                <MessageSquare
                  className="w-8 h-8"
                  style={{ color: "#4A85D6" }}
                />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                <AnimatedCounter targetValue={3280} categoryId={1002} />
              </div>
              <div className="text-gray-600">Daily Discussions</div>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#D6F3E8" }}
              >
                <Heart className="w-8 h-8" style={{ color: "#7CB99B" }} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                <AnimatedCounter targetValue={580} categoryId={1003} />
              </div>
              <div className="text-gray-600">Support Groups</div>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#FFF3D6" }}
              >
                <Award className="w-8 h-8" style={{ color: "#E6B85C" }} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                <span className="inline-flex items-center">
                  <AnimatedCounter targetValue={95} categoryId={1004} />
                  <span>%</span>
                </span>
              </div>
              <div className="text-gray-600">Questions Answered</div>
            </div>
          </div>
        </div>
      </section>}

      {/* Community Categories Preview - Hidden */}
      {false && <section
        id="community-preview"
        className="py-16"
        style={{ backgroundColor: "hsl(var(--cream-primary))" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              A Community for All Things Retirement & All Things Caregiving
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether thinking about retirement or in retirement. Whether
              planning to care or caring for someone. AskEdith is an organized
              community with curated topics, expert voices, and resources, to
              help you engage and hear from others navigating retirement and
              caring.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Retirement Categories */}
            <CategoryCard
              category={{
                id: 270,
                name: "Pension Plans",
                slug: "pension-plans",
                description: "Information and discussions about pension plans",
                postCount: 0,
              }}
              categoryImage={governmentImg}
              onJoinClick={() => setSignupModalOpen(true)}
              onExploreClick={() =>
                (window.location.href = `/category/pension-plans`)
              }
            />
            <CategoryCard
              category={{
                id: 271,
                name: "401Ks & IRAs",
                slug: "401k-iras",
                description: "Retirement account discussions and guidance",
                postCount: 0,
              }}
              categoryImage={payingForCareImg}
              onJoinClick={() => setSignupModalOpen(true)}
              onExploreClick={() =>
                (window.location.href = `/category/401k-iras`)
              }
            />
            <CategoryCard
              category={{
                id: 272,
                name: "Accessory Dwelling Units",
                slug: "accessory-dwelling-units",
                description: "ADUs, granny flats, and aging in place solutions",
                postCount: 0,
              }}
              categoryImage={seniorLivingImg}
              onJoinClick={() => setSignupModalOpen(true)}
              onExploreClick={() =>
                (window.location.href = `/category/accessory-dwelling-units`)
              }
            />

            {/* Caregiving Categories */}
            <CategoryCard
              category={{
                id: 183,
                name: "Senior Living",
                slug: "senior-living",
                description:
                  "Assisted living, memory care, and housing decisions for aging parents.",
                postCount: 0,
              }}
              categoryImage={seniorLivingImg}
              onJoinClick={() => setSignupModalOpen(true)}
              onExploreClick={() =>
                (window.location.href = `/category/senior-living`)
              }
            />
            <CategoryCard
              category={{
                id: 184,
                name: "Home Care",
                slug: "home-care",
                description:
                  "In-home caregiving, daily routines, and managing care at home.",
                postCount: 0,
              }}
              categoryImage={careAtHomeImg}
              onJoinClick={() => setSignupModalOpen(true)}
              onExploreClick={() =>
                (window.location.href = `/category/home-care`)
              }
            />
            <CategoryCard
              category={{
                id: 185,
                name: "Government Resources",
                slug: "government-resources",
                description:
                  "Medicare, Medicaid, benefits, and navigating government programs.",
                postCount: 0,
              }}
              categoryImage={governmentImg}
              onJoinClick={() => setSignupModalOpen(true)}
              onExploreClick={() =>
                (window.location.href = `/category/government-resources`)
              }
            />
          </div>

          {/* And Much More Button */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-3 text-lg font-semibold border-askEdithTeal text-askEdithTeal hover:bg-askEdithTeal hover:text-white"
              onClick={() => setSignupModalOpen(true)}
            >
              And Much More
            </Button>
          </div>
        </div>
      </section>}

      {/* Call to Action - Hidden */}
      {false && <section className="py-16 bg-white">
        <div className="px-[30px] text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Connect?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join us. Hear from Others. Share with Others.""
          </p>

          <Button
            size="lg"
            className="text-white px-8 py-4 rounded-xl font-semibold text-lg bg-[#0B666B]/95 hover:bg-[#0B666B]"
            onClick={() => setSignupModalOpen(true)}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Start a New Discussion
          </Button>
        </div>
      </section>}

      {/* Community Values - Hidden */}
      {false && <section
        className="py-16"
        style={{ backgroundColor: "hsl(var(--cream-primary))" }}
      >
        <div className="px-[30px]">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Our Community Values
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#E8D5F3" }}
              >
                <Heart className="w-8 h-8" style={{ color: "#8B7ED8" }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Compassion First
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Your journey is unique. We listen without judgment and as a
                community share knowledge with a positive vibes.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#FFE8D6" }}
              >
                <Shield className="w-8 h-8" style={{ color: "#E6845C" }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Safe Space
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Our community maintains strict privacy and safety guidelines to
                protect all members.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#E8D5F3" }}
              >
                <Users className="w-8 h-8" style={{ color: "#8B7ED8" }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Stronger Together
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Sharing experts' insights, community members' experiences to
                help you have a stronger journey.
              </p>
            </div>
          </div>
        </div>
      </section>}

      {/* Recent Discussions - Hidden */}
      {false && <section className="py-16 bg-white">
        <div className="px-[30px]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Recent Discussions
            </h2>
            <Button
              variant="outline"
              className="text-gray-600 hover:text-gray-900"
            >
              View All Discussions
            </Button>
          </div>

          <div className="space-y-6">
            {Array.isArray(recentPosts) && recentPosts.length > 0 ? (
              recentPosts.slice(0, 3).map((post: any) => (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    {post.author?.profileImageUrl ? (
                      <img
                        src={post.author.profileImageUrl}
                        alt={post.author.communityName || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <DefaultProfilePicture
                        type={post.author?.defaultProfileType || "daisy"}
                        size={40}
                        className="rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor:
                              post.category?.slug === "government-resources"
                                ? "#F4B94220"
                                : post.category?.slug === "home-care"
                                  ? "#D2524C20"
                                  : post.category?.slug === "hospital-rehab"
                                    ? "#7BB46D20"
                                    : post.category?.slug === "senior-living"
                                      ? "#E67E2220"
                                      : post.category?.slug ===
                                          "professional-advice"
                                        ? "#4ECDC420"
                                        : post.category?.slug ===
                                            "paying-for-care"
                                          ? "#0B666B20"
                                          : "#E5E7EB",
                            color:
                              post.category?.slug === "government-resources"
                                ? "#F4B942"
                                : post.category?.slug === "home-care"
                                  ? "#D2524C"
                                  : post.category?.slug === "hospital-rehab"
                                    ? "#7BB46D"
                                    : post.category?.slug === "senior-living"
                                      ? "#E67E22"
                                      : post.category?.slug ===
                                          "professional-advice"
                                        ? "#4ECDC4"
                                        : post.category?.slug ===
                                            "paying-for-care"
                                          ? "#0B666B"
                                          : "#6B7280",
                          }}
                        >
                          {post.category?.name || "General"}
                        </span>
                        {post.isResolved && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Resolved
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2 text-lg leading-tight">
                        {post.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2">
                        {post.content.length > 150
                          ? `${post.content.substring(0, 150)}...`
                          : post.content}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <span>
                            {post.author?.communityName ||
                              post.author?.firstName ||
                              "Anonymous"}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.commentCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span>{post.helpfulVotes || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No discussions yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Be the first to start a conversation!
                </p>
                <Button onClick={() => setSignupModalOpen(true)}>
                  Start First Discussion
                </Button>
              </div>
            )}
          </div>

          {Array.isArray(recentPosts) && recentPosts.length > 0 && (
            <div className="text-center mt-8">
              <Button
                size="lg"
                className="text-white px-8 py-4 rounded-xl font-semibold text-lg"
                style={{ backgroundColor: "#8B7ED8" }}
                onClick={() => setSignupModalOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Start a New Discussion
              </Button>
            </div>
          )}
        </div>
      </section>}

      {/* Footer */}
      <footer className="py-8 bg-gray-50 border-t border-gray-200">
        <div className="px-[30px] text-center">
          <p className="text-sm text-gray-600">
            copyright 2025 askedith. all rights reserved.
          </p>
        </div>
      </footer>

      <SignupModal
        open={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
      />
    </div>
  );
}
