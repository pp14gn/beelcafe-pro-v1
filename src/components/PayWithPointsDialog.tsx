import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { Coins, Gift, Loader2 } from "lucide-react";

interface PayWithPointsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pointsUsed: number, remainingAmount: number) => void;
  customerId: string;
  customerName: string;
  totalAmount: number;
}

const POINTS_PER_DOLLAR = 10; // 10 points = $1

const PayWithPointsDialog = ({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerName,
  totalAmount,
}: PayWithPointsDialogProps) => {
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();

  const maxPointsUsable = Math.min(availablePoints, Math.floor(totalAmount * POINTS_PER_DOLLAR));
  const dollarValue = pointsToUse / POINTS_PER_DOLLAR;
  const remainingToPay = Math.max(0, totalAmount - dollarValue);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerPoints();
    }
  }, [isOpen, customerId]);

  const fetchCustomerPoints = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('points')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setAvailablePoints(Number(data.points) || 0);
      setPointsToUse(0);
    } catch (error) {
      console.error('Error fetching customer points:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customer points.",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleUsePoints = async () => {
    if (pointsToUse <= 0 || !user) return;

    setIsLoading(true);
    try {
      // Deduct points from customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({ points: availablePoints - pointsToUse })
        .eq('id', customerId);

      if (updateError) throw updateError;

      // Record the redemption
      const { error: redemptionError } = await supabase
        .from('loyalty_redemptions')
        .insert({
          customer_id: customerId,
          points_spent: pointsToUse,
          redeemed_by: user.id,
        });

      if (redemptionError) {
        console.error('Redemption record error:', redemptionError);
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('customer_transactions')
        .insert({
          customer_id: customerId,
          type: 'redeem',
          points: -pointsToUse,
          description: `Redeemed ${pointsToUse} pts for $${dollarValue.toFixed(2)} payment`,
        });

      if (txError) {
        console.error('Transaction record error:', txError);
      }

      toast({
        title: "Points Applied!",
        description: `${pointsToUse} points ($${dollarValue.toFixed(2)}) applied to payment.`,
      });

      onSuccess(pointsToUse, remainingToPay);
    } catch (error) {
      console.error('Error using points:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply points.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setPointsToUse(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setPointsToUse(Math.min(Math.max(0, value), maxPointsUsable));
  };

  const handleUseAll = () => {
    setPointsToUse(maxPointsUsable);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Pay with Points
          </DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">{customerName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold text-primary">{availablePoints.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">points available</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {POINTS_PER_DOLLAR} points = $1.00
              </p>
            </div>

            {/* Order Total */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order Total:</span>
              <span className="text-xl font-bold">${totalAmount.toFixed(2)}</span>
            </div>

            <Separator />

            {availablePoints === 0 ? (
              <div className="text-center py-4">
                <Gift className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No points available</p>
                <p className="text-sm text-muted-foreground">
                  Customer will earn points after this purchase
                </p>
              </div>
            ) : (
              <>
                {/* Points Input */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Points to Use</Label>
                    <Button variant="outline" size="sm" onClick={handleUseAll}>
                      Use Max ({maxPointsUsable})
                    </Button>
                  </div>

                  <Slider
                    value={[pointsToUse]}
                    onValueChange={handleSliderChange}
                    max={maxPointsUsable}
                    step={POINTS_PER_DOLLAR}
                    className="w-full"
                  />

                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={pointsToUse}
                      onChange={handleInputChange}
                      min={0}
                      max={maxPointsUsable}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">points</span>
                    <Badge variant="secondary" className="ml-auto">
                      = ${dollarValue.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points Discount:</span>
                    <span className="text-green-600 font-medium">-${dollarValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Remaining to Pay:</span>
                    <span className="text-xl font-bold">${remainingToPay.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUsePoints}
                disabled={pointsToUse <= 0 || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Apply {pointsToUse} Points
              </Button>
            </div>

            {remainingToPay === 0 && pointsToUse > 0 && (
              <p className="text-center text-sm text-green-600">
                ✓ Full payment covered by points!
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayWithPointsDialog;
