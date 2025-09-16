import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock } from "lucide-react";

interface StartShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftStarted: (shiftId: string) => void;
}

const StartShiftDialog = ({ isOpen, onClose, onShiftStarted }: StartShiftDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [startingCash, setStartingCash] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Check if user already has an active shift
      const { data: existingShift, error: checkError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingShift) {
        toast({
          variant: "destructive",
          title: "Active Shift Found",
          description: "You already have an active shift. Please end it before starting a new one.",
        });
        setLoading(false);
        return;
      }

      // Create new shift
      const { data: shift, error } = await supabase
        .from('shifts')
        .insert([
          {
            user_id: user.id,
            starting_cash: parseFloat(startingCash),
            cash_outs_total: 0,
            sales_total: 0,
            status: 'active',
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Shift Started",
        description: `Shift started with $${parseFloat(startingCash).toFixed(2)} in cash.`,
      });

      onShiftStarted(shift.id);
      setStartingCash("");
      onClose();
    } catch (error) {
      console.error('Error starting shift:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start shift. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStartingCash("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Start New Shift
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="starting_cash">Starting Cash Amount ($)</Label>
            <Input
              id="starting_cash"
              type="number"
              step="0.01"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              placeholder="100.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount of cash in the register at the start of your shift.
            </p>
          </div>


          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                "Start Shift"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartShiftDialog;