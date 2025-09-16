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
    modifiers?: string[];
    selectedModifiers: string[];
  };
  onConfirm: (itemId: string, selectedModifiers: string[]) => void;
}

const ModifierDialog = ({ isOpen, onClose, item, onConfirm }: ModifierDialogProps) => {
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(item.selectedModifiers || []);

  const handleModifierToggle = (modifier: string) => {
    setSelectedModifiers(prev => 
      prev.includes(modifier) 
        ? prev.filter(m => m !== modifier)
        : [...prev, modifier]
    );
  };

  const handleConfirm = () => {
    onConfirm(item.id, selectedModifiers);
    onClose();
  };

  const modifierPrice = 0.50; // Each modifier adds $0.50
  const totalModifierCost = selectedModifiers.length * modifierPrice;

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
                <div key={modifier} className="flex items-center justify-between space-x-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={modifier}
                      checked={selectedModifiers.includes(modifier)}
                      onCheckedChange={() => handleModifierToggle(modifier)}
                    />
                    <label
                      htmlFor={modifier}
                      className="text-sm text-foreground cursor-pointer"
                    >
                      {modifier}
                    </label>
                  </div>
                  <span className="text-sm text-muted-foreground">+${modifierPrice.toFixed(2)}</span>
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
                    <Badge key={modifier} variant="secondary" className="text-xs">
                      {modifier}
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