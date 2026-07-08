import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import OrderTracker from "@/components/OrderTracker";
import OnlineOrdersPanel from "@/components/OnlineOrdersPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Globe } from "lucide-react";

const Orders = () => {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const { user } = useAuth();
  const { t } = useTranslation();

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
        <h1 className="text-lg lg:text-xl font-bold text-foreground">{t('orders.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {currentShift ? t('orders.track') : t('orders.no.shift')}
        </p>
      </div>

      <Tabs defaultValue="in-store" className="h-[calc(100vh-80px)] flex flex-col">
        <TabsList className="mx-3 mt-2 w-fit">
          <TabsTrigger value="in-store" className="gap-1"><Clock className="h-3 w-3" /> In-store</TabsTrigger>
          <TabsTrigger value="online" className="gap-1"><Globe className="h-3 w-3" /> Online</TabsTrigger>
        </TabsList>
        <TabsContent value="in-store" className="flex-1 overflow-auto mt-0">
          {currentShift ? (
            <OrderTracker currentShift={currentShift} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-lg font-semibold mb-2">{t('pos.no.shift')}</h2>
                <p>{t('pos.shift.required')}</p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="online" className="flex-1 overflow-auto mt-0">
          <OnlineOrdersPanel shiftId={currentShift?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;