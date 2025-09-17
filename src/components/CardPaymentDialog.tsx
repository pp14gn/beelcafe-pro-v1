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
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    securityCode: "",
    cardholderName: "",
    email: customerName ? `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com` : "",
    installments: "1",
  });

  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const getPaymentMethodId = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Simple card type detection
    if (cleanNumber.startsWith('4')) return 'visa';
    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'master';
    if (cleanNumber.startsWith('3')) return 'amex';
    
    return 'visa'; // default
  };

  const createCardToken = async () => {
    // In a real implementation, you would use MercadoPago's JavaScript SDK
    // to securely create a card token on the client side
    // For this example, we'll simulate the token creation
    
    // This is a simplified version - in production, use MercadoPago.js
    const tokenData = {
      card_number: cardData.cardNumber.replace(/\s/g, ''),
      security_code: cardData.securityCode,
      expiration_month: cardData.expiryMonth,
      expiration_year: cardData.expiryYear,
      cardholder: {
        name: cardData.cardholderName,
      }
    };

    // In production, replace this with actual MercadoPago token creation
    return `mock_token_${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!cardData.cardNumber || !cardData.expiryMonth || !cardData.expiryYear || 
          !cardData.securityCode || !cardData.cardholderName) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in all card details.",
        });
        return;
      }

      // Create card token (this should use MercadoPago.js in production)
      const cardToken = await createCardToken();
      
      // Process payment through our edge function
      const { data, error } = await supabase.functions.invoke('process-card-payment', {
        body: {
          amount: total,
          description: `Purchase - ${items.length} items${customerName ? ` for ${customerName}` : ''}`,
          email: cardData.email,
          installments: parseInt(cardData.installments),
          payment_method_id: getPaymentMethodId(cardData.cardNumber),
          token: cardToken,
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
          title: "Payment Successful",
          description: `Payment of $${total.toFixed(2)} processed successfully.`,
        });
        onSuccess(data.payment_id);
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Payment Declined",
          description: data.error || "The payment was declined by the card processor.",
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
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      securityCode: "",
      cardholderName: "",
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
            Card Payment
          </DialogTitle>
          <DialogDescription>
            Total: ${total.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                value={cardData.cardNumber}
                onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Month</Label>
                <Select value={cardData.expiryMonth} onValueChange={(value) => handleInputChange('expiryMonth', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, '0');
                      return (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryYear">Year</Label>
                <Select value={cardData.expiryYear} onValueChange={(value) => handleInputChange('expiryYear', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="YY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = (new Date().getFullYear() + i).toString().slice(-2);
                      return (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityCode">Security Code</Label>
              <Input
                id="securityCode"
                value={cardData.securityCode}
                onChange={(e) => handleInputChange('securityCode', e.target.value.replace(/\D/g, ''))}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                value={cardData.cardholderName}
                onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

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
                  Processing...
                </>
              ) : (
                `Pay $${total.toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CardPaymentDialog;