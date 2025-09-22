import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface InventoryCountApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  countId?: string;
}

interface CountData {
  id: string;
  created_at: string;
  total_items: number;
  discrepancies_count: number;
  status: string;
  user: {
    full_name: string;
  };
  inventory_count_items: {
    id: string;
    system_count: number;
    actual_count: number;
    discrepancy: number;
    inventory_item: {
      id: string;
      name: string;
      category: string;
      unit: string;
      current_stock: number;
    };
  }[];
}

const InventoryCountApprovalDialog = ({ isOpen, onClose, onSuccess, countId }: InventoryCountApprovalDialogProps) => {
  const [countData, setCountData] = useState<CountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && countId) {
      loadCountData();
    }
  }, [isOpen, countId]);

  const loadCountData = async () => {
    if (!countId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_counts')
        .select(`
          id,
          created_at,
          total_items,
          discrepancies_count,
          status,
          user_id,
          inventory_count_items (
            id,
            system_count,
            actual_count,
            discrepancy,
            inventory_item_id
          )
        `)
        .eq('id', countId)
        .single();

      if (error) throw error;
      
      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', data.user_id)
        .single();

      // Get inventory item details
      const itemsWithDetails = await Promise.all(
        data.inventory_count_items.map(async (item: any) => {
          const { data: inventoryData } = await supabase
            .from('inventory_items')
            .select('id, name, category, unit, current_stock')
            .eq('id', item.inventory_item_id)
            .single();
            
          return {
            ...item,
            inventory_item: inventoryData || {}
          };
        })
      );
      
      setCountData({
        ...data,
        user: userData || { full_name: 'Unknown User' },
        inventory_count_items: itemsWithDetails
      });
    } catch (error) {
      console.error('Error loading count data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory count data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!countData) return;

    setApproving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      // Update inventory levels for discrepancies
      const discrepancies = countData.inventory_count_items.filter(item => item.discrepancy !== 0);
      
      for (const item of discrepancies) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ 
            current_stock: item.actual_count,
            last_restocked: new Date().toISOString()
          })
          .eq('id', item.inventory_item.id);

        if (updateError) throw updateError;
      }

      // Update count status
      const { error: countError } = await supabase
        .from('inventory_counts')
        .update({
          status: 'approved',
          approved_by: user.user?.id,
          approved_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', countId);

      if (countError) throw countError;

      toast({
        title: "Count Approved",
        description: `Inventory levels updated for ${discrepancies.length} items.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error approving count:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve inventory count.",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!countData) return;

    setRejecting(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('inventory_counts')
        .update({
          status: 'rejected',
          approved_by: user.user?.id,
          approved_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', countId);

      if (error) throw error;

      toast({
        title: "Count Rejected",
        description: "Inventory count has been rejected. No changes made to inventory levels.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error rejecting count:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject inventory count.",
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleClose = () => {
    setCountData(null);
    setNotes("");
    onClose();
  };

  const discrepancies = countData?.inventory_count_items.filter(item => item.discrepancy !== 0) || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Inventory Count Approval
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading count data...</span>
          </div>
        ) : countData ? (
          <div className="space-y-4">
            {/* Count Summary */}
            <Card className="p-4">
              <h4 className="font-medium mb-3">Count Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Counter:</span>
                  <p className="font-medium">{countData.user.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p>{new Date(countData.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Items:</span>
                  <p>{countData.total_items}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Discrepancies:</span>
                  <p className="font-medium text-amber-600">{countData.discrepancies_count}</p>
                </div>
              </div>
            </Card>

            {/* Discrepancies */}
            {discrepancies.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium mb-3">Items with Discrepancies</h4>
                <div className="space-y-3">
                  {discrepancies.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium">{item.inventory_item.name}</h5>
                          <p className="text-sm text-muted-foreground capitalize">
                            {item.inventory_item.category}
                          </p>
                        </div>
                        <Badge variant={item.discrepancy < 0 ? "destructive" : "secondary"}>
                          {item.discrepancy > 0 ? '+' : ''}{item.discrepancy} {item.inventory_item.unit}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">System:</span>
                          <p>{item.system_count} {item.inventory_item.unit}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actual:</span>
                          <p>{item.actual_count} {item.inventory_item.unit}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current Stock:</span>
                          <p>{item.inventory_item.current_stock} {item.inventory_item.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this count..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejecting || approving}
                  className="gap-2"
                >
                  {rejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approving || rejecting}
                  className="gap-2"
                >
                  {approving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Approve & Update
                </Button>
              </div>
            </div>

            {countData.discrepancies_count > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700">
                  <strong>Note:</strong> Approving this count will update the inventory levels 
                  for {countData.discrepancies_count} items based on the actual counts provided.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default InventoryCountApprovalDialog;