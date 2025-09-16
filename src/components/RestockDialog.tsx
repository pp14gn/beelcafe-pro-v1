import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RestockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: any;
}

const RestockDialog = ({ isOpen, onClose, onSuccess, item }: RestockDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [restockAmount, setRestockAmount] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !restockAmount) return;

    setLoading(true);

    try {
      const newStock = (item.current_stock || 0) + parseFloat(restockAmount);
      
      const { error } = await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          last_restocked: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${restockAmount} ${item.unit} to ${item.name}. New stock: ${newStock} ${item.unit}`,
      });

      onSuccess();
      onClose();
      setRestockAmount("");
    } catch (error) {
      console.error("Error restocking item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restock inventory item.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restock Inventory</DialogTitle>
        </DialogHeader>
        
        {item && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium">{item.name}</h4>
              <p className="text-sm text-muted-foreground">
                Current Stock: {item.current_stock} {item.unit}
              </p>
              <p className="text-sm text-muted-foreground">
                Minimum Stock: {item.min_stock} {item.unit}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restock_amount">Amount to Add ({item.unit})</Label>
                <Input
                  id="restock_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  placeholder={`Enter amount in ${item.unit}`}
                  required
                />
              </div>

              {restockAmount && (
                <div className="bg-coffee-gold/10 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>New Stock Level:</strong> {(item.current_stock + parseFloat(restockAmount || "0")).toFixed(2)} {item.unit}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !restockAmount}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Restocking...
                    </>
                  ) : (
                    "Restock Item"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RestockDialog;