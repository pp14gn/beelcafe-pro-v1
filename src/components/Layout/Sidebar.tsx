import { NavLink, useLocation } from "react-router-dom";
import { 
  Coffee, 
  ShoppingCart, 
  Package, 
  Users, 
  ChefHat, 
  BarChart3, 
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { to: "/", icon: ShoppingCart, label: "POS System", primary: true },
    { to: "/inventory", icon: Package, label: "Inventory" },
    { to: "/recipes", icon: ChefHat, label: "Recipes" },
    { to: "/staff", icon: Users, label: "Staff" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-coffee shadow-elevated">
      {/* Logo Header */}
      <div className="flex items-center gap-3 p-6 border-b border-coffee-cream/20">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coffee-gold">
          <Coffee className="h-6 w-6 text-coffee-bean" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-coffee-cream">CoffeePos</h1>
          <p className="text-sm text-coffee-cream/70">Pro System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
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
          <div className="h-8 w-8 rounded-full bg-coffee-gold flex items-center justify-center">
            <span className="text-sm font-semibold text-coffee-bean">JD</span>
          </div>
          <div>
            <p className="text-sm font-medium text-coffee-cream">John Doe</p>
            <p className="text-xs text-coffee-cream/60">Manager</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-3 text-coffee-cream/80 hover:bg-coffee-cream/10 hover:text-coffee-cream"
          onClick={() => {
            // Add logout functionality here
            console.log("Signing out...");
            // For now, just reload the page
            window.location.reload();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;