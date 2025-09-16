import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Eye, EyeOff, Loader2 } from "lucide-react";

interface CashOutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentCashTotal: number;
}

const CashOutDialog = ({ isOpen, onClose, currentCashTotal }: CashOutDialogProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState(currentCashTotal.toString());
  const { userProfile, user } = useAuth();
  const { toast } = useToast();

  const handleCashOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !user || !userProfile) return;

    setLoading(true);

    try {
      // Verify password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
        });
        setLoading(false);
        return;
      }

      // Record cash out transaction
      const { error: cashOutError } = await supabase
        .from('cash_outs')
        .insert([
          {
            user_id: user.id,
            amount: parseFloat(cashOutAmount),
            remaining_cash: 0, // Assuming full cash out
            notes: `Cash out by ${userProfile.full_name || userProfile.username}`,
          },
        ]);

      if (cashOutError) {
        console.error('Cash out error:', cashOutError);
        toast({
          variant: "destructive",
          title: "Cash Out Failed",
          description: "Failed to record cash out transaction.",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Cash Out Successful",
        description: `$${parseFloat(cashOutAmount).toFixed(2)} has been cashed out.`,
      });

      // Reset form and close dialog
      setPassword("");
      setCashOutAmount("0");
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    }

    setLoading(false);
  };

  const handleClose = () => {
    setPassword("");
    setCashOutAmount(currentCashTotal.toString());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-elevated z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-coffee-gold" />
            Cash Out
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCashOut} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Current Cash Total:</span>
              <span className="text-lg font-bold text-coffee-gold">
                ${currentCashTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cashOutAmount" className="text-foreground">
                Cash Out Amount
              </Label>
              <Input
                id="cashOutAmount"
                type="number"
                step="0.01"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                className="bg-background border-border"
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-semibold">
                Confirm with Your Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password to confirm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the password for <strong>{userProfile?.username}</strong> to authorize this cash out.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !password || !cashOutAmount}
              className="bg-gradient-coffee hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Cash Out"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CashOutDialog;