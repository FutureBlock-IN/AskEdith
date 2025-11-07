import { useState, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

// Caduceus Medical Icon Component
const CaduceusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M35 25 Q25 20 15 25 Q20 15 30 20 Q35 15 40 20 L35 25" />
    <path d="M65 25 Q75 20 85 25 Q80 15 70 20 Q65 15 60 20 L65 25" />
    <line x1="50" y1="20" x2="50" y2="90" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="50" cy="20" r="4" />
    <path d="M40 35 Q55 40 45 50 Q35 55 50 60 Q65 65 55 75" 
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M60 35 Q45 40 55 50 Q65 55 50 60 Q35 65 45 75" 
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="45" cy="75" r="3" />
    <circle cx="55" cy="75" r="3" />
    <circle cx="44" cy="74" r="0.8" fill="white"/>
    <circle cx="56" cy="74" r="0.8" fill="white"/>
    <circle cx="50" cy="85" r="4" />
  </svg>
);

// Animated Counter Component
function AnimatedCounter({ targetValue, categoryId, compact = false }: { targetValue: number; categoryId: number; compact?: boolean }) {
  const [currentValue, setCurrentValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const animateCounter = () => {
    const duration = 2000;
    const increment = targetValue / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetValue) {
        setCurrentValue(targetValue);
        clearInterval(timer);
      } else {
        setCurrentValue(Math.floor(current));
      }
    }, 16);
  };

  return (
    <div ref={elementRef} className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
      {currentValue.toLocaleString()}
    </div>
  );
}

interface CategoryCardProps {
  category: {
    id: number;
    name: string;
    slug: string;
    description: string;
    postCount?: number;
  };
  categoryImage?: string;
  onJoinClick?: () => void;
  onExploreClick?: () => void;
  compact?: boolean; // Add compact mode for narrower sections
}

export default function CategoryCard({ 
  category, 
  categoryImage, 
  onJoinClick, 
  onExploreClick,
  compact = false
}: CategoryCardProps) {
  // Get button colors based on category slug
  const getButtonColor = (slug: string) => {
    switch (slug) {
      case 'government-resources': return '#F4B942';
      case 'home-care': return '#D2524C';
      case 'hospital-rehab': return '#7BB46D';
      case 'senior-living': return '#E67E22';
      case 'professional-advice': return '#4ECDC4';
      case 'paying-for-care': return '#0B666B';
      case 'health-conditions': return '#DC2626';
      case 'family-finances': return '#16A34A';
      case 'professionals': return '#2563EB';
      default: return '#0B666B';
    }
  };

  const buttonColor = getButtonColor(category.slug);

  return (
    <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-6 min-h-[180px]' : 'p-8 min-h-[200px]'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`rounded-full flex items-center justify-center bg-gray-100 flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
            {category.slug === 'health-conditions' ? (
              <CaduceusIcon className={`text-red-600 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
            ) : (
              <img 
                src={categoryImage || ''}
                alt={category.name}
                className={`object-cover rounded-full ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
              />
            )}
          </div>
          <div>
            <h3 className={`font-semibold text-gray-900 leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
              {category.name}
            </h3>
          </div>
        </div>
        <div className={`flex flex-col items-center text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
          <div className="flex items-center space-x-1 mb-1">
            <MessageSquare className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            <span>posts</span>
          </div>
          <AnimatedCounter 
            targetValue={category.postCount || 0}
            categoryId={category.id}
            compact={compact}
          />
        </div>
      </div>

      <p className={`text-gray-600 leading-relaxed ${compact ? 'text-sm mb-4' : 'text-base mb-6'}`}>
        {category.description}
      </p>

      <div className="flex w-full rounded-lg overflow-hidden border border-gray-200 mt-4">
        <button 
          className="flex-1 text-white text-sm font-semibold py-3 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: buttonColor }}
          onClick={onJoinClick}
        >
          Join
        </button>
        <div className="w-px bg-white/30"></div>
        <button 
          className="flex-1 text-white text-sm font-semibold py-3 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: buttonColor }}
          onClick={onExploreClick}
        >
          Explore
        </button>
      </div>
    </div>
  );
}