import React, { useState, useEffect } from "react";
import { Search, Loader2, ExternalLink, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface RagSearchResult {
  paragraphs: string[];
  confidence: number;
  sources: Array<{
    question: string;
    content: string;
    score: number;
    source: string;
  }>;
  totalSources: number;
}

export function RagSearch() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RagSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleParagraphs, setVisibleParagraphs] = useState<number>(0);
  const [paragraphVisibility, setParagraphVisibility] = useState<{
    [key: number]: boolean;
  }>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setVisibleParagraphs(0);
    setParagraphVisibility({});

    try {
      const response = await fetch("/api/rag-search-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to search");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let metadata: any = null;
      let currentParagraphs: string[] = [];
      let buffer = ""; // Buffer for incomplete chunks

      if (reader) {
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
                  // Ignore heartbeat messages - they're just to establish connection
                  continue;
                } else if (data.type === "metadata") {
                  metadata = data;
                } else if (data.type === "content") {
                  fullContent += data.content;

                  // Split content by newlines to detect paragraphs
                  const newParagraphs = fullContent
                    .split("\n")
                    .filter((p) => p.trim());

                  // If we have more paragraphs than before, update
                  if (newParagraphs.length > currentParagraphs.length) {
                    currentParagraphs = newParagraphs;
                    setResult({
                      paragraphs: [...currentParagraphs],
                      confidence: metadata?.confidence || 0,
                      sources:
                        metadata?.sources?.map((source: any) => ({
                          question: source.chunk.metadata.question,
                          content:
                            source.chunk.chunkText.substring(0, 200) + "...",
                          score: source.score,
                          source: source.source,
                        })) || [],
                      totalSources: metadata?.sources?.length || 0,
                    });
                  }
                } else if (data.type === "error") {
                  throw new Error(data.error || "Streaming error");
                } else if (data.type === "end") {
                  // Final cleanup - make sure all content is included
                  const finalParagraphs = fullContent
                    .split("\n")
                    .filter((p) => p.trim());
                  if (finalParagraphs.length > 0) {
                    setResult((prev) =>
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

              // Handle final data chunk
              if (data.type === "content") {
                fullContent += data.content;
                const finalParagraphs = fullContent
                  .split("\n")
                  .filter((p) => p.trim());
                if (finalParagraphs.length > 0) {
                  setResult((prev) =>
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fade-in for new paragraphs as they arrive
  useEffect(() => {
    if (!result) return;

    // When new paragraphs arrive during streaming, fade them in
    if (result.paragraphs.length > visibleParagraphs) {
      setVisibleParagraphs(result.paragraphs.length);

      // Trigger fade-in for the new paragraph after a short delay
      const newParagraphIndex = result.paragraphs.length - 1;
      setTimeout(() => {
        setParagraphVisibility((prev) => ({
          ...prev,
          [newParagraphIndex]: true,
        }));
      }, 50); // Small delay to ensure DOM is updated
    }
  }, [result?.paragraphs.length, visibleParagraphs]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI-Powered Q&A Search
        </h1>
        <p className="text-gray-600">
          Ask questions about ADUs, elder care, and retirement planning. Our AI
          will search through our knowledge base and provide detailed answers
          with sources.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about ADUs, elder care, or retirement planning..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {result && (
        <div 
          className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-white"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
        >
          <div className="space-y-6">
            {/* Answer */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Answer</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.confidence > 0.8
                        ? "bg-green-100 text-green-800"
                        : result.confidence > 0.6
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                {result.paragraphs.map((paragraph, index) => (
                  <div
                    key={`paragraph-${index}`}
                    style={{
                      marginBottom: "20px",
                      padding: "10px",
                      backgroundColor: '#f9f9f9',
                      fontSize: "1.1rem",
                      lineHeight: "1.7"
                    }}
                  >
                    <ReactMarkdown>{paragraph}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hidden">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sources ({result.totalSources})
            </h3>
            <div className="space-y-4">
              {result.sources.map((source, index) => (
                <div
                  key={index}
                  className="border border-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {source.question}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Score:</span>
                      <span className="text-xs font-medium text-blue-600">
                        {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{source.content}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Source: {source.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Example Queries */}
      {!result && !isLoading && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Example Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "What is an ADU and how can it be used for elder care?",
              "How much does it typically cost to build an ADU?",
              "What are the zoning requirements for ADUs?",
              "How can I make an ADU accessible for someone with mobility issues?",
              "What are the maintenance responsibilities for an ADU?",
              "How does living in an ADU affect government benefits?",
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setQuery(example)}
                className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm text-gray-700">{example}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
