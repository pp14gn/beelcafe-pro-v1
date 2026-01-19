import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface BulkUploadInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkUploadInventoryDialog = ({ isOpen, onClose, onSuccess }: BulkUploadInventoryDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateData = [
      {
        name: "Espresso Beans",
        category: "coffee",
        current_stock: 50,
        min_stock: 10,
        unit: "kg",
        cost_per_unit: 25.00,
        supplier: "Coffee Supplier Co."
      },
      {
        name: "Whole Milk",
        category: "dairy",
        current_stock: 20,
        min_stock: 5,
        unit: "L",
        cost_per_unit: 3.50,
        supplier: "Local Dairy Farm"
      },
      {
        name: "Sugar",
        category: "sweeteners",
        current_stock: 30,
        min_stock: 8,
        unit: "kg",
        cost_per_unit: 2.00,
        supplier: "Food Supplies Inc."
      },
      {
        name: "Paper Cups (12oz)",
        category: "supplies",
        current_stock: 500,
        min_stock: 100,
        unit: "pcs",
        cost_per_unit: 0.15,
        supplier: "Packaging Direct"
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    ws['!cols'] = [
      { width: 25 }, // name
      { width: 15 }, // category
      { width: 15 }, // current_stock
      { width: 12 }, // min_stock
      { width: 10 }, // unit
      { width: 15 }, // cost_per_unit
      { width: 25 }  // supplier
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    XLSX.writeFile(wb, "inventory_template.xlsx");

    toast({
      title: "Template Downloaded",
      description: "Excel template has been downloaded successfully."
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel"
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select an Excel (.xlsx) file."
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select an Excel file to upload."
      });
      return;
    }

    setUploading(true);

    try {
      const data = await parseExcelFile(file);
      
      if (!data.length) {
        throw new Error("No data found in the Excel file");
      }

      const validCategories = ['coffee', 'dairy', 'sweeteners', 'supplies', 'consumables'];
      
      const inventoryItems = data.map((row: any, index: number) => {
        const requiredFields = ['name', 'category', 'unit'];
        const missingFields = requiredFields.filter(field => !row[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Row ${index + 2}: Missing required fields: ${missingFields.join(', ')}`);
        }

        const category = String(row.category).toLowerCase().trim();
        if (!validCategories.includes(category)) {
          throw new Error(`Row ${index + 2}: Invalid category "${row.category}". Valid categories: ${validCategories.join(', ')}`);
        }

        const currentStock = row.current_stock !== undefined ? Number(row.current_stock) : 0;
        const minStock = row.min_stock !== undefined ? Number(row.min_stock) : 0;
        const costPerUnit = row.cost_per_unit !== undefined ? Number(row.cost_per_unit) : 0;

        if (isNaN(currentStock) || isNaN(minStock) || isNaN(costPerUnit)) {
          throw new Error(`Row ${index + 2}: Stock and cost values must be valid numbers`);
        }

        return {
          name: String(row.name).trim(),
          category: category,
          current_stock: currentStock,
          min_stock: minStock,
          unit: String(row.unit).trim(),
          cost_per_unit: costPerUnit,
          supplier: row.supplier ? String(row.supplier).trim() : null,
          last_restocked: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('inventory_items')
        .insert(inventoryItems);

      if (error) throw error;

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${inventoryItems.length} inventory items.`
      });

      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload inventory items. Please check your file format."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template Section */}
          <Card className="p-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-coffee-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Download Template</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Start by downloading our Excel template with sample data and required format.
                </p>
                <Button 
                  variant="outline" 
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>
          </Card>

          {/* Upload Section */}
          <Card className="p-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-pos-success/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-pos-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Upload Inventory Items</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Select your completed Excel file to upload multiple inventory items at once.
                </p>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-pos-info mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-2">Template Instructions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>name</strong>: Item name (required)</li>
                  <li>• <strong>category</strong>: coffee, dairy, sweeteners, supplies, or consumables (required)</li>
                  <li>• <strong>current_stock</strong>: Current quantity in stock (defaults to 0)</li>
                  <li>• <strong>min_stock</strong>: Minimum stock level for alerts (defaults to 0)</li>
                  <li>• <strong>unit</strong>: Unit of measurement, e.g., kg, L, pcs (required)</li>
                  <li>• <strong>cost_per_unit</strong>: Cost per unit in decimal format (defaults to 0)</li>
                  <li>• <strong>supplier</strong>: Supplier name (optional)</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Items
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadInventoryDialog;
