import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { receiptPrinter } from "@/utils/receiptPrinter";
import { Loader2, Package, CheckCircle } from "lucide-react";

interface InventoryCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CountItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  systemCount: number;
  actualCount: number;
  photo_url?: string;
}

const InventoryCountDialog = ({ isOpen, onClose, onSuccess }: InventoryCountDialogProps) => {
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countSessionId, setCountSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startInventoryCount();
    }
  }, [isOpen]);

  const startInventoryCount = async () => {
    setLoading(true);
    try {
      // Fetch all inventory items
      const { data: allItems, error: fetchError } = await supabase
        .from('inventory_items')
        .select('id, name, category, unit, current_stock, photo_url')
        .order('name');

      if (fetchError) throw fetchError;

      // Select 10 random items
      const shuffled = [...(allItems || [])].sort(() => 0.5 - Math.random());
      const selectedItems = shuffled.slice(0, 10);

      // Create count session
      const { data: sessionData, error: sessionError } = await supabase
        .from('inventory_counts')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          total_items: selectedItems.length,
          status: 'pending'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setCountSessionId(sessionData.id);

      // Map to count items
      const countItems: CountItem[] = selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        systemCount: item.current_stock,
        actualCount: 0,
        photo_url: item.photo_url
      }));

      setCountItems(countItems);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error starting inventory count:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start inventory count.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (value: string) => {
    const actualCount = parseFloat(value) || 0;
    setCountItems(prev => prev.map((item, index) => 
      index === currentIndex ? { ...item, actualCount } : item
    ));
  };

  const handleNext = () => {
    if (currentIndex < countItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinishCount = async () => {
    setSaving(true);
    try {
      // Save count items
      const countItemsData = countItems.map(item => ({
        count_id: countSessionId,
        inventory_item_id: item.id,
        system_count: item.systemCount,
        actual_count: item.actualCount
      }));

      const { error: itemsError } = await supabase
        .from('inventory_count_items')
        .insert(countItemsData);

      if (itemsError) throw itemsError;

      // Calculate discrepancies
      const discrepancies = countItems.filter(item => item.actualCount !== item.systemCount);

      // Update count session
      const { error: updateError } = await supabase
        .from('inventory_counts')
        .update({
          discrepancies_count: discrepancies.length,
          status: discrepancies.length > 0 ? 'pending_approval' : 'completed'
        })
        .eq('id', countSessionId);

      if (updateError) throw updateError;

      // Print receipt
      await printInventoryCountReceipt();

      toast({
        title: "Inventory Count Complete",
        description: `Count completed with ${discrepancies.length} discrepancies. ${discrepancies.length > 0 ? 'Awaiting admin approval.' : 'All counts match!'}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error finishing inventory count:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save inventory count.",
      });
    } finally {
      setSaving(false);
    }
  };

  const printInventoryCountReceipt = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.user?.id)
        .single();

      const discrepancies = countItems.filter(item => item.actualCount !== item.systemCount);

      receiptPrinter.printInventoryCountReceipt({
        storeName: "Beelcafe",
        storeAddress: "123 Coffee Street",
        storePhone: "(555) 123-4567",
        counter: userProfile?.full_name || 'Unknown User',
        timestamp: new Date(),
        receiptNumber: `IC-${Date.now()}`,
        items: countItems,
        totalItems: countItems.length,
        discrepanciesCount: discrepancies.length,
        discrepancies: discrepancies
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
    }
  };

  const handleClose = () => {
    setCountItems([]);
    setCurrentIndex(0);
    setCountSessionId(null);
    onClose();
  };

  const currentItem = countItems[currentIndex];
  const isLastItem = currentIndex === countItems.length - 1;
  const isFirstItem = currentIndex === 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Count
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Starting inventory count...</span>
          </div>
        ) : countItems.length > 0 ? (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Item {currentIndex + 1} of {countItems.length}</span>
              <Badge variant="outline">{Math.round(((currentIndex + 1) / countItems.length) * 100)}%</Badge>
            </div>

            {/* Current Item */}
            <Card className="p-4">
              <div className="space-y-3">
                {currentItem?.photo_url && (
                  <img 
                    src={currentItem.photo_url} 
                    alt={currentItem.name}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                )}
                <div>
                  <h4 className="font-medium">{currentItem?.name}</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {currentItem?.category}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">System Count:</span>
                    <p className="font-medium">
                      {currentItem?.systemCount} {currentItem?.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit:</span>
                    <p>{currentItem?.unit}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Actual Count</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem?.actualCount || ''}
                    onChange={(e) => handleCountChange(e.target.value)}
                    placeholder="Enter actual count..."
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstItem}
              >
                Previous
              </Button>
              
              {isLastItem ? (
                <Button
                  onClick={handleFinishCount}
                  disabled={saving || countItems.some(item => item.actualCount === 0)}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Finish Count
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentItem?.actualCount === 0}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default InventoryCountDialog;