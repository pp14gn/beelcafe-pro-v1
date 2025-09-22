import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUploadDialog = ({ isOpen, onClose, onSuccess }: BulkUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Create sample data for the template
    const templateData = [
      {
        name: "Cappuccino",
        category: "coffee",
        description: "Rich espresso with steamed milk foam",
        base_price: 4.50,
        prep_time: 3,
        servings: 1,
        instructions: "Pull double shot espresso|Steam milk to 150°F|Pour steamed milk over espresso|Top with foam"
      },
      {
        name: "Caesar Salad",
        category: "food",
        description: "Fresh romaine lettuce with caesar dressing",
        base_price: 12.99,
        prep_time: 5,
        servings: 1,
        instructions: "Wash and chop romaine lettuce|Add croutons and parmesan|Toss with caesar dressing|Serve immediately"
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { width: 20 }, // name
      { width: 15 }, // category
      { width: 30 }, // description
      { width: 12 }, // base_price
      { width: 12 }, // prep_time
      { width: 10 }, // servings
      { width: 50 }  // instructions
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Recipes Template");

    // Save file
    XLSX.writeFile(wb, "recipes_template.xlsx");

    toast({
      title: "Template Downloaded",
      description: "Excel template has been downloaded successfully."
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
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
      // Parse Excel file
      const data = await parseExcelFile(file);
      
      if (!data.length) {
        throw new Error("No data found in the Excel file");
      }

      // Validate and transform data
      const recipes = data.map((row: any, index: number) => {
        const requiredFields = ['name', 'category', 'base_price'];
        const missingFields = requiredFields.filter(field => !row[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Row ${index + 2}: Missing required fields: ${missingFields.join(', ')}`);
        }

        return {
          name: String(row.name).trim(),
          category: String(row.category).toLowerCase().trim(),
          description: row.description ? String(row.description).trim() : null,
          base_price: Number(row.base_price),
          prep_time: row.prep_time ? Number(row.prep_time) : null,
          servings: row.servings ? Number(row.servings) : 1,
          instructions: row.instructions ? String(row.instructions).split('|').map((s: string) => s.trim()) : null,
          is_active: true
        };
      });

      // Insert recipes into database
      const { error } = await supabase
        .from('recipes')
        .insert(recipes);

      if (error) throw error;

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${recipes.length} recipes.`
      });

      onSuccess();
      onClose();
      setFile(null);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload recipes. Please check your file format."
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Recipes
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
                <h3 className="font-semibold mb-2">Upload Recipes</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Select your completed Excel file to upload multiple recipes at once.
                </p>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept=".xlsx"
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
                  <li>• <strong>name</strong>: Recipe name (required)</li>
                  <li>• <strong>category</strong>: coffee, food, pastries, etc. (required)</li>
                  <li>• <strong>description</strong>: Brief description (optional)</li>
                  <li>• <strong>base_price</strong>: Price in decimal format, e.g., 4.50 (required)</li>
                  <li>• <strong>prep_time</strong>: Preparation time in minutes (optional)</li>
                  <li>• <strong>servings</strong>: Number of servings, defaults to 1 (optional)</li>
                  <li>• <strong>instructions</strong>: Separate steps with | symbol (optional)</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Recipes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};