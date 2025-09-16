import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";
import beelcafeLogo from '@/assets/beelcafe-logo.png';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

const MobileHeader = ({ onMenuToggle }: MobileHeaderProps) => {
  const { userProfile } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-coffee border-b border-coffee-cream/20 h-16">
      <div className="flex items-center justify-between px-4 h-full">
        <div className="flex items-center gap-3">
          <img 
            src={beelcafeLogo} 
            alt="Beelcafe Logo" 
            className="h-8 w-8 rounded-full"
          />
          <div>
            <h1 className="text-lg font-bold text-coffee-cream">Beelcafe</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-coffee-cream">
              {userProfile?.full_name || userProfile?.username || 'User'}
            </p>
            <p className="text-xs text-coffee-cream/60 capitalize">
              {userProfile?.role || 'Staff'}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="text-coffee-cream hover:bg-coffee-cream/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;