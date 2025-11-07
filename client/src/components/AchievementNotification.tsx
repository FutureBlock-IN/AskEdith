// components/AchievementNotification.tsx
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Achievement {
  id: number;
  name: string;
  description: string;
}

interface UserAchievement {
  id: number;
  earnedAt: string;
  achievement: Achievement;
}

export function AchievementWatcher() {
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState(Date.now());
  
  const { data: achievements } = useQuery<UserAchievement[]>({
    queryKey: ['/api/users', user?.id, 'achievements'],
    enabled: !!user?.id,
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  useEffect(() => {
    if (achievements && Array.isArray(achievements)) {
      const newAchievements = achievements.filter((a: UserAchievement) => 
        new Date(a.earnedAt).getTime() > lastCheck
      );
      
      newAchievements.forEach((achievement: UserAchievement) => {
        toast({
          title: "Achievement Unlocked! 🏆",
          description: `${achievement.achievement.name}: ${achievement.achievement.description}`,
          duration: 5000,
        });
      });
      
      if (newAchievements.length > 0) {
        setLastCheck(Date.now());
      }
    }
  }, [achievements, lastCheck]);
  
  return null;
}