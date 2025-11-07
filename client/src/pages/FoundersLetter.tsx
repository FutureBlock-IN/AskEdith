import { useQuery } from "@tanstack/react-query";
import SearchHeader from "@/components/SearchHeader";
import DynamicDiscussionTopicsSidebar from "@/components/DynamicDiscussionTopicsSidebar";

export default function FoundersLetter() {
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories/hierarchy"],
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <SearchHeader title="Founder's Letter" showActionButtons={false} />

      <div className="flex">
        {/* Sidebar */}
        <DynamicDiscussionTopicsSidebar />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                A Letter from Our Founder
              </h1>

              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                <p>Dear Community Members,</p>

                <p>
                  When I first envisioned AskEdith, it was born from a deeply
                  personal place—watching my own family navigate the complex
                  world of caregiving and retirement planning. Like so many of
                  you, I found myself searching for reliable information,
                  support, and most importantly, a community that truly
                  understood the challenges we face.
                </p>

                <p>
                  The statistics are staggering: over 53 million Americans are
                  currently providing care for an adult family member or friend,
                  and millions more are approaching retirement with uncertainty
                  about their future. Yet despite these numbers, finding
                  trustworthy guidance and genuine community support often feels
                  impossible.
                </p>

                <p>
                  That's why we created this space—not just as another website,
                  but as a true community where your experiences matter, your
                  questions are welcomed, and your wisdom is valued. Here,
                  you'll find expert guidance from verified professionals,
                  curated resources from trusted sources, and most importantly,
                  connection with others who share your journey.
                </p>

                <p>
                  Whether you're researching memory care options for a parent,
                  planning your own retirement, or simply looking for someone
                  who understands the emotional weight of caregiving decisions,
                  you belong here. Every forum discussion, every expert
                  consultation, and every piece of curated content is designed
                  with your real-world needs in mind.
                </p>

                <p>
                  We believe that informed decisions lead to better outcomes,
                  and that no one should have to navigate these important life
                  transitions alone. Our platform combines the wisdom of lived
                  experience with professional expertise, creating a resource
                  that's both comprehensive and deeply human.
                </p>

                <p>
                  As we continue to grow and evolve, your feedback shapes every
                  decision we make. This community belongs to all of us, and
                  together, we're building something that truly makes a
                  difference in people's lives.
                </p>

                <p>
                  Thank you for being part of this journey. Thank you for
                  sharing your stories, asking important questions, and
                  supporting one another. And thank you for trusting us to be a
                  part of your story.
                </p>

                <p className="mt-8">With deep gratitude and warm regards,</p>

                <div className="mt-8 border-t pt-6">
                  <div className="text-2xl font-semibold text-gray-900 mb-2">
                    Elias Papasavvas
                  </div>
                  <div className="text-lg text-gray-600">
                    Founder & CEO, AskEdith Community
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    Former family caregiver, retirement planning advocate, and
                    believer in the power of community
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
