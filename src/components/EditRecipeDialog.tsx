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
import { Textarea } from "@/components/ui/textarea";
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

interface EditRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recipe: any;
}

const EditRecipeDialog = ({ isOpen, onClose, onSuccess, recipe }: EditRecipeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    base_price: "",
    prep_time: "",
    servings: "1",
    instructions: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name || "",
        category: recipe.category || "",
        description: recipe.description || "",
        base_price: recipe.base_price?.toString() || "",
        prep_time: recipe.prep_time?.toString() || "",
        servings: recipe.servings?.toString() || "1",
        instructions: Array.isArray(recipe.instructions) 
          ? recipe.instructions.join('\n') 
          : (recipe.instructions || ""),
      });
    }
  }, [recipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe) return;

    setLoading(true);

    try {
      const instructionsArray = formData.instructions
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim());

      const { error } = await supabase
        .from("recipes")
        .update({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          base_price: parseFloat(formData.base_price),
          prep_time: parseInt(formData.prep_time),
          servings: parseInt(formData.servings),
          instructions: instructionsArray,
        })
        .eq("id", recipe.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recipe updated successfully.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating recipe:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update recipe.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name</Label>
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
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="pastries">Pastries</SelectItem>
                <SelectItem value="beverages">Beverages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the recipe"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price ($)</Label>
              <Input
                id="base_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep_time">Prep Time (minutes)</Label>
              <Input
                id="prep_time"
                type="number"
                min="1"
                value={formData.prep_time}
                onChange={(e) => setFormData(prev => ({ ...prev, prep_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={formData.servings}
                onChange={(e) => setFormData(prev => ({ ...prev, servings: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (one per line)</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Enter each instruction on a new line..."
              rows={6}
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
                "Update Recipe"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecipeDialog;