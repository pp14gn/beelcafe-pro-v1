import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package } from "lucide-react";

interface AddInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddInventoryDialog = ({ isOpen, onClose, onSuccess }: AddInventoryDialogProps) => {
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

  const categories = [
    { value: "coffee", label: "Coffee" },
    { value: "dairy", label: "Dairy" },
    { value: "sweeteners", label: "Sweeteners" },
    { value: "supplies", label: "Supplies" },
    { value: "pastries", label: "Pastries" },
    { value: "food", label: "Food Ingredients" },
  ];

  const units = [
    { value: "lbs", label: "Pounds (lbs)" },
    { value: "oz", label: "Ounces (oz)" },
    { value: "gallons", label: "Gallons" },
    { value: "containers", label: "Containers" },
    { value: "units", label: "Units" },
    { value: "bags", label: "Bags" },
    { value: "boxes", label: "Boxes" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('inventory_items')
        .insert([
          {
            name: formData.name,
            category: formData.category,
            current_stock: parseFloat(formData.current_stock),
            min_stock: parseFloat(formData.min_stock),
            unit: formData.unit,
            cost_per_unit: parseFloat(formData.cost_per_unit),
            supplier: formData.supplier,
            last_restocked: new Date().toISOString(),
          }
        ]);

      if (error) throw error;

      toast({
        title: "Inventory Item Added",
        description: `${formData.name} has been added to inventory successfully.`,
      });

      // Reset form
      setFormData({
        name: "",
        category: "",
        current_stock: "",
        min_stock: "",
        unit: "",
        cost_per_unit: "",
        supplier: "",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add inventory item. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      category: "",
      current_stock: "",
      min_stock: "",
      unit: "",
      cost_per_unit: "",
      supplier: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Inventory Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Coffee Beans - Arabica"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                step="0.01"
                value={formData.current_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, current_stock: e.target.value }))}
                placeholder="25"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock">Minimum Stock</Label>
              <Input
                id="min_stock"
                type="number"
                step="0.01"
                value={formData.min_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                placeholder="10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select 
              value={formData.unit} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_per_unit">Cost per Unit ($)</Label>
            <Input
              id="cost_per_unit"
              type="number"
              step="0.01"
              value={formData.cost_per_unit}
              onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
              placeholder="12.50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="e.g., Premium Coffee Co."
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                "Add Item"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryDialog;