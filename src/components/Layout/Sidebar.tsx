import { NavLink, useLocation } from "react-router-dom";
import { 
  Coffee, 
  ShoppingCart, 
  Package, 
  Users, 
  ChefHat, 
  BarChart3, 
  Settings,
  LogOut,
  Clock,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import beelcafeLogo from '@/assets/beelcafe-logo.png';

const Sidebar = () => {
  const location = useLocation();
  const { userProfile, signOut } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { to: "/pos", icon: ShoppingCart, label: t('nav.pos'), primary: true },
    { to: "/orders", icon: Clock, label: t('nav.orders') },
    { to: "/customers", icon: Gift, label: t('nav.customers') },
    { to: "/inventory", icon: Package, label: t('nav.inventory'), requiredRole: "manager" },
    { to: "/recipes", icon: ChefHat, label: t('nav.recipes'), requiredRole: "manager" },
    { to: "/staff", icon: Users, label: t('nav.staff'), requiredRole: "manager" },
    { to: "/analytics", icon: BarChart3, label: t('nav.analytics'), requiredRole: "manager" },
    { to: "/settings", icon: Settings, label: t('nav.settings') },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.requiredRole || 
    userProfile?.role === 'admin' || 
    userProfile?.role === item.requiredRole
  );

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-coffee shadow-elevated">
      {/* Logo Header */}
      <div className="flex items-center gap-3 p-6 border-b border-coffee-cream/20">
        <img 
          src={beelcafeLogo} 
          alt="Beelcafe Logo" 
          className="h-12 w-12 rounded-full shadow-pos"
        />
        <div>
          <h1 className="text-lg font-bold text-coffee-cream">Beelcafe</h1>
          <p className="text-sm text-coffee-cream/70">POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-coffee-cream text-coffee-bean shadow-pos"
                  : "text-coffee-cream/80 hover:bg-coffee-cream/10 hover:text-coffee-cream"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator className="bg-coffee-cream/20" />

      {/* User Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 px-4 py-2">
          <Avatar className="h-8 w-8">
            {userProfile?.picture_url ? (
              <AvatarImage src={userProfile.picture_url} alt={userProfile.full_name || userProfile.username || 'User'} />
            ) : (
              <AvatarFallback className="bg-coffee-gold text-coffee-bean text-sm font-semibold">
                {userProfile?.full_name?.charAt(0) || userProfile?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="text-sm font-medium text-coffee-cream">
              {userProfile?.full_name || userProfile?.username || 'User'}
            </p>
            <p className="text-xs text-coffee-cream/60 capitalize">
              {userProfile?.role || 'Staff'}
            </p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-3 text-coffee-cream/80 hover:bg-coffee-cream/10 hover:text-coffee-cream"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {t('common.no') === 'No' ? 'Sign Out' : 'Cerrar Sesión'}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;