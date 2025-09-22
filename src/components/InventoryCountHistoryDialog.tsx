import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InventoryCountApprovalDialog from "@/components/InventoryCountApprovalDialog";
import { Loader2, ClipboardList, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";

interface InventoryCountHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CountHistoryItem {
  id: string;
  created_at: string;
  total_items: number;
  discrepancies_count: number;
  status: string;
  users: {
    full_name: string;
  } | null;
}

const InventoryCountHistoryDialog = ({ isOpen, onClose }: InventoryCountHistoryDialogProps) => {
  const [counts, setCounts] = useState<CountHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadCounts();
    }
  }, [isOpen]);

  const loadCounts = async () => {
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
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get user details separately
      const countsWithUsers = await Promise.all(
        (data || []).map(async (count) => {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', count.user_id)
            .single();
            
          return {
            ...count,
            users: userData || { full_name: 'Unknown User' }
          };
        })
      );
      
      setCounts(countsWithUsers);
    } catch (error) {
      console.error('Error loading counts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory count history.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCount = (countId: string) => {
    setSelectedCountId(countId);
    setApprovalDialogOpen(true);
  };

  const getStatusBadge = (status: string, discrepanciesCount: number) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />In Progress</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700"><AlertTriangle className="h-3 w-3" />Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      case 'completed':
        return <Badge variant="default" className="gap-1 bg-blue-100 text-blue-700 border-blue-300"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleClose = () => {
    setCounts([]);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Inventory Count History
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading count history...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {counts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory counts found.
                </div>
              ) : (
                counts.map((count) => (
                  <Card key={count.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">Count #{count.id.substring(0, 8)}</h4>
                          {getStatusBadge(count.status, count.discrepancies_count)}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p>{new Date(count.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Counter:</span>
                            <p>{count.users?.full_name || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items:</span>
                            <p>{count.total_items}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Discrepancies:</span>
                            <p className={count.discrepancies_count > 0 ? "text-amber-600 font-medium" : ""}>
                              {count.discrepancies_count}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCount(count.id)}
                          className="gap-2"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        {count.status === 'pending_approval' && (
                          <Button
                            size="sm"
                            onClick={() => handleViewCount(count.id)}
                            className="gap-2 bg-amber-600 hover:bg-amber-700"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InventoryCountApprovalDialog
        isOpen={approvalDialogOpen}
        onClose={() => {
          setApprovalDialogOpen(false);
          setSelectedCountId(undefined);
          loadCounts(); // Refresh the list
        }}
        onSuccess={() => {
          loadCounts(); // Refresh the list
        }}
        countId={selectedCountId}
      />
    </>
  );
};

export default InventoryCountHistoryDialog;