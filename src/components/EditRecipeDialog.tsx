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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Edit3 } from "lucide-react";
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
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [editingModifier, setEditingModifier] = useState<any>(null);
  const [newModifier, setNewModifier] = useState({ name: "", price: "" });
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
      setModifiers(recipe.recipe_modifiers || []);
    }
  }, [recipe]);

  const addModifier = async () => {
    if (!newModifier.name || !newModifier.price) return;
    
    try {
      const { data, error } = await supabase
        .from('recipe_modifiers')
        .insert({
          recipe_id: recipe.id,
          name: newModifier.name,
          price: parseFloat(newModifier.price),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setModifiers([...modifiers, data]);
      setNewModifier({ name: "", price: "" });
      
      toast({
        title: "Success",
        description: "Modifier added successfully.",
      });
    } catch (error) {
      console.error("Error adding modifier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add modifier.",
      });
    }
  };

  const updateModifier = async (modifierId: string, name: string, price: string) => {
    try {
      const { error } = await supabase
        .from('recipe_modifiers')
        .update({
          name: name,
          price: parseFloat(price)
        })
        .eq('id', modifierId);

      if (error) throw error;

      setModifiers(modifiers.map(mod => 
        mod.id === modifierId 
          ? { ...mod, name, price: parseFloat(price) }
          : mod
      ));
      setEditingModifier(null);
      
      toast({
        title: "Success",
        description: "Modifier updated successfully.",
      });
    } catch (error) {
      console.error("Error updating modifier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update modifier.",
      });
    }
  };

  const deleteModifier = async (modifierId: string) => {
    try {
      const { error } = await supabase
        .from('recipe_modifiers')
        .delete()
        .eq('id', modifierId);

      if (error) throw error;

      setModifiers(modifiers.filter(mod => mod.id !== modifierId));
      
      toast({
        title: "Success",
        description: "Modifier deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting modifier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete modifier.",
      });
    }
  };

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

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Recipe Modifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new modifier */}
              <div className="flex gap-2">
                <Input
                  placeholder="Modifier name"
                  value={newModifier.name}
                  onChange={(e) => setNewModifier(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={newModifier.price}
                  onChange={(e) => setNewModifier(prev => ({ ...prev, price: e.target.value }))}
                />
                <Button onClick={addModifier} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Existing modifiers */}
              <div className="space-y-2">
                {modifiers.map((modifier) => (
                  <div key={modifier.id} className="flex items-center gap-2 p-2 border rounded">
                    {editingModifier?.id === modifier.id ? (
                      <>
                        <Input
                          value={editingModifier.name}
                          onChange={(e) => setEditingModifier(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={editingModifier.price}
                          onChange={(e) => setEditingModifier(prev => ({ ...prev, price: e.target.value }))}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => updateModifier(modifier.id, editingModifier.name, editingModifier.price)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingModifier(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="font-medium">{modifier.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            ${modifier.price.toFixed(2)}
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setEditingModifier({ 
                            id: modifier.id, 
                            name: modifier.name, 
                            price: modifier.price.toString() 
                          })}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteModifier(modifier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {modifiers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No modifiers added yet. Add your first modifier above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

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