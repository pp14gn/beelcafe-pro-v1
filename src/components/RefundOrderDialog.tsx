import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";

interface RefundOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    total_amount: number;
    items: any[];
    customer_name?: string;
  };
  onRefundComplete: () => void;
}

const RefundOrderDialog = ({ isOpen, onClose, order, onRefundComplete }: RefundOrderDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleRefund = async () => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-order-refund', {
        body: { orderId: order.id }
      });

      if (error) throw error;

      toast({
        title: "Order Refunded",
        description: "The order has been cancelled and inventory has been restored.",
      });

      onRefundComplete();
      onClose();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        variant: "destructive",
        title: "Refund Failed",
        description: error.message || "Failed to process the refund. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Refund Order
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to refund this order? This action will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Cancel the order</li>
              <li>Restore all inventory items to stock</li>
              <li>Remove the sale from records</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg">
          <div className="text-sm">
            <div className="font-medium mb-2">Order #{order.id.slice(-6)}</div>
            {order.customer_name && (
              <div className="text-muted-foreground mb-2">Customer: {order.customer_name}</div>
            )}
            <div className="space-y-1">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${((item.price + (item.selectedModifiers?.length || 0) * 0.50) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mt-2 font-semibold">
              Total: ${order.total_amount.toFixed(2)}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRefund}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Refund Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundOrderDialog;