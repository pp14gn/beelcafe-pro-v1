import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award } from "lucide-react";

interface MembershipTierBadgeProps {
  tier: string;
  size?: "sm" | "md" | "lg";
}

export const getTierInfo = (tier: string) => {
  switch (tier) {
    case 'gold':
      return {
        label: 'Gold',
        icon: Crown,
        color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
        minPoints: 1000,
        multiplier: 1.5,
      };
    case 'silver':
      return {
        label: 'Silver',
        icon: Medal,
        color: 'bg-slate-400/20 text-slate-600 border-slate-400/30',
        minPoints: 500,
        multiplier: 1.25,
      };
    default:
      return {
        label: 'Bronze',
        icon: Award,
        color: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
        minPoints: 0,
        multiplier: 1,
      };
  }
};

export const calculateTier = (totalSpent: number): string => {
  // Tier based on total spent: Gold = $100+, Silver = $50+, Bronze = default
  if (totalSpent >= 100) return 'gold';
  if (totalSpent >= 50) return 'silver';
  return 'bronze';
};

const MembershipTierBadge = ({ tier, size = "md" }: MembershipTierBadgeProps) => {
  const tierInfo = getTierInfo(tier);
  const Icon = tierInfo.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge 
      variant="outline" 
      className={`${tierInfo.color} ${sizeClasses[size]} flex items-center gap-1`}
    >
      <Icon className={iconSizes[size]} />
      {tierInfo.label}
    </Badge>
  );
};

export default MembershipTierBadge;