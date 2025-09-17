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
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2 } from "lucide-react";

interface CardPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  total: number;
  items: any[];
  customerName?: string;
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
  userId,
  shiftId 
}: CardPaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    email: customerName ? `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com` : "",
    installments: "1",
  });

  const { toast } = useToast();

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
      // Validate required fields
      if (!cardData.email) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter an email address.",
        });
        return;
      }

      // Process payment through our edge function
      const { data, error } = await supabase.functions.invoke('process-card-payment', {
        body: {
          amount: total,
          description: `Purchase - ${items.length} items${customerName ? ` for ${customerName}` : ''}`,
          email: cardData.email,
          installments: parseInt(cardData.installments),
          user_id: userId,
          shift_id: shiftId,
          items: items,
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
      email: customerName ? `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com` : "",
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
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={cardData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="customer@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments">Installments</Label>
              <Select value={cardData.installments} onValueChange={(value) => handleInputChange('installments', value)}>
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
          </Card>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
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