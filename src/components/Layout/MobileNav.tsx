import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  ChefHat, 
  BarChart3, 
  Settings,
  LogOut,
  X,
  Clock
} from "lucide-react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  const { userProfile, signOut } = useAuth();

  const navItems = [
    { to: "/pos", icon: ShoppingCart, label: "POS System" },
    { to: "/orders", icon: Clock, label: "Orders" },
    { to: "/inventory", icon: Package, label: "Inventory", requiredRole: "manager" },
    { to: "/recipes", icon: ChefHat, label: "Recipes", requiredRole: "manager" },
    { to: "/staff", icon: Users, label: "Staff", requiredRole: "manager" },
    { to: "/analytics", icon: BarChart3, label: "Analytics", requiredRole: "manager" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.requiredRole || 
    userProfile?.role === 'admin' || 
    userProfile?.role === item.requiredRole
  );

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Slide-out navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-coffee border-t border-coffee-cream/20 z-50 transform transition-transform duration-300 ease-in-out">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-coffee-cream">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-coffee-cream hover:bg-coffee-cream/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-2 rounded-xl p-4 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-coffee-cream text-coffee-bean"
                      : "text-coffee-cream/80 hover:bg-coffee-cream/10 hover:text-coffee-cream"
                  }`
                }
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs text-center">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-center gap-2 text-coffee-cream/80 hover:bg-coffee-cream/10 hover:text-coffee-cream"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileNav;