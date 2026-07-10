import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeClockProps {
  currentShift?: any;
  onShiftAutoClose?: () => void;
}

const RealtimeClock = ({ currentShift, onShiftAutoClose }: RealtimeClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasNotifiedClosing, setHasNotifiedClosing] = useState(false);
  const [hasAutoClosedShift, setHasAutoClosedShift] = useState(false);
  
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentShift || !settings.closeTime) return;

    const now = new Date();
    const today = now.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[today];

    // Check if store is supposed to be operating today
    if (!settings.operatingDays.includes(currentDay)) return;

    const [closeHour, closeMinute] = settings.closeTime.split(':').map(Number);
    
    // Create closing time for today
    const closingTime = new Date();
    closingTime.setHours(closeHour, closeMinute, 0, 0);
    
    // Create notification time (5 minutes before closing)
    const notificationTime = new Date(closingTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - 5);
    
    // Create auto-close time (15 minutes after closing)
    const autoCloseTime = new Date(closingTime);
    autoCloseTime.setMinutes(autoCloseTime.getMinutes() + 15);

    // Show notification 5 minutes before closing
    if (now >= notificationTime && now < closingTime && !hasNotifiedClosing) {
      setHasNotifiedClosing(true);
      toast({
        title: "Store Closing Soon",
        description: `The store will close at ${settings.closeTime}. Please prepare to close your shift.`,
        variant: "default",
      });

      // Play sound notification if enabled
      if (settings.soundNotifications) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBD2W2+/AciUILoPM7tmKOQgZYrfl5J5REQxOqOLvt2UdCjuO0vHNeSsFJHHA8N2QQA8UWrHm7KlWFgpFpN/xwmwfBDyc2O7CdSUTC4PJ69eIPgkZarrk4qNUEQuS0+/TeC0EK3zB791nnT4rAA==');
        audio.play().catch(() => {}); // Ignore if audio fails to play
      }
    }

    // Auto-close shift 15 minutes after closing
    // Only fire within a 30-minute window after autoCloseTime, and only if the
    // shift actually started before today's closing time. This prevents the
    // component from auto-closing a freshly opened shift whenever the POS page
    // is remounted (e.g. tab/route changes) at a time that happens to be past
    // the store's closing hour.
    const autoCloseWindowEnd = new Date(autoCloseTime);
    autoCloseWindowEnd.setMinutes(autoCloseWindowEnd.getMinutes() + 30);

    const shiftStart = currentShift?.start_time ? new Date(currentShift.start_time) : null;
    const shiftStartedBeforeClose = shiftStart ? shiftStart < closingTime : false;

    if (
      now >= autoCloseTime &&
      now < autoCloseWindowEnd &&
      !hasAutoClosedShift &&
      currentShift?.status === 'active' &&
      shiftStartedBeforeClose
    ) {
      setHasAutoClosedShift(true);
      handleAutoCloseShift();
    }
  }, [currentTime, currentShift, settings, hasNotifiedClosing, hasAutoClosedShift, toast, user]);

  const handleAutoCloseShift = async () => {
    if (!user || !currentShift) return;

    try {
      // Update shift to ended status
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          ending_cash: 0, // Default ending cash, should be calculated properly
        })
        .eq('id', currentShift.id);

      if (error) {
        console.error('Error auto-closing shift:', error);
        return;
      }

      toast({
        title: "Shift Auto-Closed",
        description: "Your shift has been automatically closed due to store closing hours.",
        variant: "default",
      });

      // Call parent callback if provided
      onShiftAutoClose?.();
    } catch (error) {
      console.error('Error auto-closing shift:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStoreStatus = () => {
    const now = new Date();
    const today = now.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[today];

    if (!settings.operatingDays.includes(currentDay)) {
      return { status: 'closed', reason: 'Store closed today' };
    }

    const [openHour, openMinute] = settings.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = settings.closeTime.split(':').map(Number);

    const openTime = new Date();
    openTime.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date();
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    const fiveMinutesBeforeClose = new Date(closeTime);
    fiveMinutesBeforeClose.setMinutes(fiveMinutesBeforeClose.getMinutes() - 5);

    if (now < openTime) {
      return { status: 'closed', reason: `Opens at ${settings.openTime}` };
    } else if (now >= fiveMinutesBeforeClose && now < closeTime) {
      return { status: 'closing', reason: `Closing at ${settings.closeTime}` };
    } else if (now >= closeTime) {
      return { status: 'closed', reason: `Closed at ${settings.closeTime}` };
    } else {
      return { status: 'open', reason: `Open until ${settings.closeTime}` };
    }
  };

  const storeStatus = getStoreStatus();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge 
            variant={storeStatus.status === 'open' ? 'default' : storeStatus.status === 'closing' ? 'secondary' : 'outline'}
            className={
              storeStatus.status === 'open' 
                ? 'bg-green-500 hover:bg-green-600' 
                : storeStatus.status === 'closing'
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }
          >
            {storeStatus.status === 'closing' && (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {storeStatus.status.charAt(0).toUpperCase() + storeStatus.status.slice(1)}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {storeStatus.reason}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RealtimeClock;