import { ReactNode } from "react";
import DynamicDiscussionTopicsSidebar from "./DynamicDiscussionTopicsSidebar";
import SearchHeader from "./SearchHeader";
import EmailVerificationBanner from "./EmailVerificationBanner";
import { useAuth } from "@/hooks/useAuth";

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showSearchHeader?: boolean;
  searchHeaderTitle?: string;
  showActionButtons?: boolean;
  sortBy?: "hot" | "new" | "top";
  onSortChange?: (sort: "hot" | "new" | "top") => void;
  onSearch?: (query: string) => void;
}

export default function MainLayout({ 
  children, 
  showSidebar = true,
  showSearchHeader = true,
  searchHeaderTitle,
  showActionButtons = true,
  sortBy,
  onSortChange,
  onSearch
}: MainLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const showEmailBanner = isAuthenticated && user && !user.emailVerified;

  return (
    <div className="min-h-screen bg-gray-50">
      {showSearchHeader && (
        <SearchHeader 
          title={searchHeaderTitle}
          showActionButtons={showActionButtons}
          sortBy={sortBy}
          onSortChange={onSortChange}
          onSearch={onSearch}
        />
      )}
      {showEmailBanner && user?.email && (
        <div className="px-[30px] pt-4">
          <EmailVerificationBanner email={user.email} />
        </div>
      )}
      <div className="px-[30px] py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Sidebar - 25% width (3/12) */}
          {showSidebar && (
            <div className="lg:col-span-3">
              <DynamicDiscussionTopicsSidebar />
            </div>
          )}
          
          {/* Main Content - 55% width (7/12) */}
          <div className={showSidebar ? "lg:col-span-7" : "lg:col-span-12"}>
            {children}
          </div>

          {/* Right Sidebar - 20% width (2/12) for Advertisers */}
          {showSidebar && (
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-xl border border-white shadow-sm p-6" style={{ minHeight: '800px' }}>
                <div className="text-center text-gray-500 text-xs">
                  Ads
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}