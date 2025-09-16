import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  name: string;
  current_stock: number;
  min_stock: number;
  status: 'critical' | 'low' | 'adequate';
}

interface InventoryWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lowStockItems: InventoryItem[];
  criticalStockItems: InventoryItem[];
}

const InventoryWarningDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lowStockItems, 
  criticalStockItems 
}: InventoryWarningDialogProps) => {
  const hasCriticalItems = criticalStockItems.length > 0;
  const hasLowStockItems = lowStockItems.length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Inventory Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {hasCriticalItems && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="text-xs">
                      Critical Stock
                    </Badge>
                    <span className="text-sm font-medium">Items at 0 stock:</span>
                  </div>
                  <div className="space-y-1">
                    {criticalStockItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Package className="h-3 w-3 text-destructive" />
                        <span>{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.current_stock} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasLowStockItems && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      Low Stock
                    </Badge>
                    <span className="text-sm font-medium">Items running low:</span>
                  </div>
                  <div className="space-y-1">
                    {lowStockItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Package className="h-3 w-3 text-amber-500" />
                        <span>{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.current_stock} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {hasCriticalItems 
                  ? "Some ingredients are out of stock. Do you want to proceed with this order?"
                  : "Some ingredients are running low. Consider restocking soon."
                }
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={hasCriticalItems ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {hasCriticalItems ? "Proceed Anyway" : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InventoryWarningDialog;