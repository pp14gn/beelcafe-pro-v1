import { useState } from "react";
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

interface ModifierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    price: number;
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
  }[]) => void;
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
    onConfirm(item.id, selectedModifiers);
    onClose();
  };

  const totalModifierCost = selectedModifiers.reduce((sum, mod) => sum + (mod.inventory_item.cost_per_unit * mod.quantity), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-elevated z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Customize {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Base Price:</span>
            <span className="font-semibold text-coffee-gold">${item.price.toFixed(2)}</span>
          </div>

          <Separator />

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
              ${(item.price + totalModifierCost).toFixed(2)}
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