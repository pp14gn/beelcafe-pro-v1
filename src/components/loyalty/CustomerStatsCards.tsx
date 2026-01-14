import { Users, Gift, TrendingUp, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CustomerStats {
  totalCustomers: number;
  totalPoints: number;
  averageSpent: number;
  goldMembers: number;
}

interface CustomerStatsCardsProps {
  stats: CustomerStats;
}

const CustomerStatsCards = ({ stats }: CustomerStatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Members</p>
            <p className="text-xl font-bold">{stats.totalCustomers}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Points</p>
            <p className="text-xl font-bold">{stats.totalPoints.toFixed(0)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. Spent</p>
            <p className="text-xl font-bold">${stats.averageSpent.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Crown className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gold Members</p>
            <p className="text-xl font-bold">{stats.goldMembers}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomerStatsCards;