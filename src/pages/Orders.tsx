import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OrderTracker from "@/components/OrderTracker";
import { Clock } from "lucide-react";

const Orders = () => {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadCurrentShift();
  }, [user]);

  const loadCurrentShift = async () => {
    if (!user) return;

    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading current shift:', error);
        return;
      }

      setCurrentShift(shift);
    } catch (error) {
      console.error('Error loading current shift:', error);
    }
  };

  return (
    <div className="h-screen bg-background">
      <div className="p-3 lg:p-4 border-b border-border">
        <h1 className="text-lg lg:text-xl font-bold text-foreground">Open Orders</h1>
        <p className="text-muted-foreground text-sm">
          {currentShift ? 'Track and manage active orders' : 'Start a shift to view orders'}
        </p>
      </div>

      <div className="h-[calc(100vh-80px)]">
        {currentShift ? (
          <OrderTracker currentShift={currentShift} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-semibold mb-2">No Active Shift</h2>
              <p>Start a shift from the POS system to view and manage orders</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;