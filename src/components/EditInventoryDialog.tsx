import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: any;
}

const EditInventoryDialog = ({ isOpen, onClose, onSuccess, item }: EditInventoryDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    current_stock: "",
    min_stock: "",
    unit: "",
    cost_per_unit: "",
    supplier: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        category: item.category || "",
        current_stock: item.current_stock?.toString() || "",
        min_stock: item.min_stock?.toString() || "",
        unit: item.unit || "",
        cost_per_unit: item.cost_per_unit?.toString() || "",
        supplier: item.supplier || "",
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: formData.name,
          category: formData.category,
          current_stock: parseFloat(formData.current_stock),
          min_stock: parseFloat(formData.min_stock),
          unit: formData.unit,
          cost_per_unit: parseFloat(formData.cost_per_unit),
          supplier: formData.supplier,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inventory item updated successfully.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating inventory item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update inventory item.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coffee">Coffee</SelectItem>
                <SelectItem value="dairy">Dairy</SelectItem>
                <SelectItem value="sweeteners">Sweeteners</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="food">Food</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.current_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, current_stock: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Minimum Stock</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g., lbs, gallons, units"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Cost per Unit ($)</Label>
              <Input
                id="cost_per_unit"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Item"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInventoryDialog;