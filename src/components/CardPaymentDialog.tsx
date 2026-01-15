import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, AlertTriangle } from "lucide-react";

interface CardPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  total: number;
  items: any[];
  customerName?: string;
  customerId?: string;
  userId: string;
  shiftId?: string;
}

const CardPaymentDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  total, 
  items, 
  customerName,
  customerId,
  userId,
  shiftId 
}: CardPaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    installments: "1",
  });

  const { toast } = useToast();
  const { settings } = useSettings();

  // Check if Point is configured
  const isPointConfigured = settings.pointEnabled && 
                          settings.selectedPosId && 
                          settings.selectedTerminalId;

  const handleInputChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    return value;
  };

  const getPaymentMethodId = (cardNumber: string) => {
    return 'point';
  };

  const createCardToken = async () => {
    // Point API doesn't need card token
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Process payment through our edge function
      const { data, error } = await supabase.functions.invoke('process-card-payment', {
        body: {
          amount: total,
          description: `Purchase - ${items.length} items${customerName ? ` for ${customerName}` : ''}`,
          email: "customer@store.com",
          installments: parseInt(cardData.installments),
          user_id: userId,
          shift_id: shiftId,
          items: items,
          customer_id: customerId,
          // Point configuration
          pos_id: settings.selectedPosId,
          terminal_id: settings.selectedTerminalId,
        },
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: error.message || "There was an error processing your payment.",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Order Created",
          description: `Order for $${total.toFixed(2)} created successfully. Please complete payment on the device.`,
        });
        onSuccess(data.order_id);
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Order Creation Failed",
          description: data.error || "Failed to create payment order.",
        });
      }

    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: "An unexpected error occurred while processing the payment.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCardData({
      installments: "1",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            MercadoPago Point Payment
          </DialogTitle>
          <DialogDescription>
            Total: ${total.toFixed(2)} - Complete payment on the device
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isPointConfigured && (
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <p className="font-medium">Point Not Configured</p>
                  <p className="text-sm">Please configure MercadoPago Point in Settings before using card payments.</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="installments">Installments</Label>
              <Select 
                value={cardData.installments} 
                onValueChange={(value) => handleInputChange('installments', value)}
                disabled={!isPointConfigured}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (No interest)</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="6">6x</SelectItem>
                  <SelectItem value="12">12x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isPointConfigured && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>POS: {settings.selectedPosId}</p>
                <p>Terminal: {settings.selectedTerminalId}</p>
              </div>
            )}
          </Card>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isPointConfigured} 
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Order...
                </>
              ) : (
                `Create Order $${total.toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CardPaymentDialog;