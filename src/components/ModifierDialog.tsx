import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecipeSize {
  id: string;
  name: string;
  price_adjustment: number;
  ingredient_multiplier: number;
  is_default: boolean;
}

interface ModifierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    price: number;
    has_sizes?: boolean;
    modifiers?: {
      id: string;
      inventory_item: {
        id: string;
        name: string;
        cost_per_unit: number;
        unit: string;
      };
      quantity: number;
    }[];
    selectedModifiers: {
      id: string;
      inventory_item: {
        id: string;
        name: string;
        cost_per_unit: number;
        unit: string;
      };
      quantity: number;
    }[];
    selectedSize?: RecipeSize;
  };
  onConfirm: (itemId: string, selectedModifiers: {
    id: string;
    inventory_item: {
      id: string;
      name: string;
      cost_per_unit: number;
      unit: string;
    };
    quantity: number;
  }[], selectedSize?: RecipeSize) => void;
}

const ModifierDialog = ({ isOpen, onClose, item, onConfirm }: ModifierDialogProps) => {
  const [selectedModifiers, setSelectedModifiers] = useState<{
    id: string;
    inventory_item: {
      id: string;
      name: string;
      cost_per_unit: number;
      unit: string;
    };
    quantity: number;
  }[]>(item.selectedModifiers || []);
  const [sizes, setSizes] = useState<RecipeSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<RecipeSize | undefined>(item.selectedSize);
  const [loadingSizes, setLoadingSizes] = useState(false);

  useEffect(() => {
    if (isOpen && item.has_sizes) {
      loadSizes();
    }
  }, [isOpen, item.id, item.has_sizes]);

  useEffect(() => {
    setSelectedModifiers(item.selectedModifiers || []);
    setSelectedSize(item.selectedSize);
  }, [item]);

  const loadSizes = async () => {
    setLoadingSizes(true);
    try {
      const { data, error } = await supabase
        .from('recipe_sizes')
        .select('*')
        .eq('recipe_id', item.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      setSizes(data || []);
      
      // Set default size if none selected
      if (!selectedSize && data && data.length > 0) {
        const defaultSize = data.find(s => s.is_default) || data[0];
        setSelectedSize(defaultSize);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleModifierToggle = (modifier: {
    id: string;
    inventory_item: {
      id: string;
      name: string;
      cost_per_unit: number;
      unit: string;
    };
    quantity: number;
  }) => {
    setSelectedModifiers(prev => 
      prev.find(m => m.id === modifier.id)
        ? prev.filter(m => m.id !== modifier.id)
        : [...prev, modifier]
    );
  };

  const handleConfirm = () => {
    // Ensure a size is chosen when the item supports sizes
    let sizeToApply = selectedSize;
    if (item.has_sizes && !sizeToApply && sizes.length > 0) {
      sizeToApply = sizes.find(s => s.is_default) || sizes[0];
    }
    onConfirm(item.id, selectedModifiers, sizeToApply);
    onClose();
  };

  const getEffectivePrice = () => {
    const basePrice = item.price;
    const sizeAdjustment = selectedSize?.price_adjustment || 0;
    return basePrice + sizeAdjustment;
  };

  const totalModifierCost = selectedModifiers.reduce((sum, mod) => sum + (mod.inventory_item.cost_per_unit * mod.quantity), 0);
  const effectivePrice = getEffectivePrice();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-elevated z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Customize {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Size Selection */}
          {item.has_sizes && sizes.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Select Size
                </h4>
                <ToggleGroup
                  type="single"
                  value={selectedSize?.id || ""}
                  onValueChange={(value) => {
                    const size = sizes.find(s => s.id === value);
                    if (size) setSelectedSize(size);
                  }}
                  className="flex flex-wrap gap-2"
                >
                  {sizes.map((size) => (
                    <ToggleGroupItem
                      key={size.id}
                      value={size.id}
                      className="flex-1 min-w-[80px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{size.name}</span>
                        <span className="text-xs opacity-75">
                          {size.price_adjustment >= 0 ? '+' : ''}${size.price_adjustment.toFixed(2)}
                        </span>
                      </div>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <Separator />
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {item.has_sizes && selectedSize ? `${selectedSize.name} Price:` : 'Base Price:'}
            </span>
            <span className="font-semibold text-coffee-gold">${effectivePrice.toFixed(2)}</span>
          </div>

          <Separator />

          {item.modifiers && item.modifiers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Available Modifiers</h4>
              <div className="space-y-3">
                {item.modifiers?.map((modifier) => (
                  <div key={modifier.id} className="flex items-center justify-between space-x-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={modifier.id}
                        checked={selectedModifiers.some(m => m.id === modifier.id)}
                        onCheckedChange={() => handleModifierToggle(modifier)}
                      />
                      <label
                        htmlFor={modifier.id}
                        className="text-sm text-foreground cursor-pointer"
                      >
                        {modifier.inventory_item.name} x{modifier.quantity} {modifier.inventory_item.unit}
                      </label>
                    </div>
                    <span className="text-sm text-muted-foreground">+${(modifier.inventory_item.cost_per_unit * modifier.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedModifiers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Selected Modifiers:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedModifiers.map((modifier) => (
                    <Badge key={modifier.id} variant="secondary" className="text-xs">
                      {modifier.inventory_item.name} x{modifier.quantity} (+${(modifier.inventory_item.cost_per_unit * modifier.quantity).toFixed(2)})
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Total Price:</span>
            <span className="text-lg font-bold text-coffee-gold">
              ${(effectivePrice + totalModifierCost).toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-gradient-coffee hover:opacity-90">
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModifierDialog;
