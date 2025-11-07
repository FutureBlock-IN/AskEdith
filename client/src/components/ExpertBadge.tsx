import { Crown } from "lucide-react";

interface ExpertBadgeProps {
  level: 'bronze' | 'silver' | 'gold';
  postCount: number;
  className?: string;
}

export default function ExpertBadge({ level, postCount, className = "" }: ExpertBadgeProps) {
  const getBadgeConfig = () => {
    switch (level) {
      case 'bronze':
        return {
          color: '#CD7F32',
          text: 'Bronze Expert'
        };
      case 'silver':
        return {
          color: '#C0C0C0',
          text: 'Silver Expert'
        };
      case 'gold':
        return {
          color: '#FFBF00',
          text: 'Gold Expert'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div 
      className={`inline-flex items-center gap-1 text-xs font-bold text-teal-600 ${className}`}
      title={`${config.text} - ${postCount} posts this year`}
    >
      {/* <Crown className="w-4 h-4" style={{ color: config.color, fill: config.color }} />
      <span>{config.text}</span> */}
    </div>
  );
}