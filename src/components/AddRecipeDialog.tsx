import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChefHat, Plus, Minus, X } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

interface RecipeIngredient {
  inventory_item_id: string;
  quantity: number;
  name: string;
  unit: string;
}

interface RecipeModifier {
  inventory_item_id: string;
  quantity: number;
}

interface AddRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddRecipeDialog = ({ isOpen, onClose, onSuccess }: AddRecipeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    base_price: "",
    prep_time: "",
    servings: "",
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [modifiers, setModifiers] = useState<RecipeModifier[]>([]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [availableInventoryItems, setAvailableInventoryItems] = useState<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadInventoryItems();
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'recipe')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const { data: inventoryData, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;

      setAvailableInventoryItems(inventoryData || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { inventory_item_id: "", quantity: 0, name: "", unit: "" }]);
  };

  const updateIngredient = (index: number, field: string, value: string | number) => {
    const updated = [...ingredients];
    if (field === 'inventory_item_id') {
      const item = availableInventoryItems.find(i => i.id === value);
      if (item) {
        updated[index] = { ...updated[index], inventory_item_id: value as string, name: item.name, unit: item.unit };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addModifier = () => {
    setModifiers([...modifiers, { inventory_item_id: "", quantity: 1 }]);
  };

  const updateModifier = (index: number, field: string, value: string | number) => {
    const updated = [...modifiers];
    updated[index] = { ...updated[index], [field]: value };
    setModifiers(updated);
  };

  const removeModifier = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([
          {
            name: formData.name,
            category: formData.category,
            description: formData.description,
            base_price: parseFloat(formData.base_price),
            prep_time: parseInt(formData.prep_time),
            servings: parseInt(formData.servings),
            instructions: instructions.filter(i => i.trim() !== ""),
          }
        ])
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Insert recipe ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map(ingredient => ({
              recipe_id: recipe.id,
              inventory_item_id: ingredient.inventory_item_id,
              quantity: ingredient.quantity,
            }))
          );

        if (ingredientsError) throw ingredientsError;
      }

      // Insert recipe modifiers
      if (modifiers.length > 0) {
        const { error: modifiersError } = await supabase
          .from('recipe_modifiers')
          .insert(
            modifiers.map(modifier => ({
              recipe_id: recipe.id,
              inventory_item_id: modifier.inventory_item_id,
              quantity: modifier.quantity,
            }))
          );

        if (modifiersError) throw modifiersError;
      }

      toast({
        title: "Recipe Added",
        description: `${formData.name} has been added successfully.`,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding recipe:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add recipe. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      base_price: "",
      prep_time: "",
      servings: "",
    });
    setIngredients([]);
    setModifiers([]);
    setInstructions([""]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Add New Recipe
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Recipe Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Classic Latte"
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
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the recipe"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price ($)</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                  placeholder="4.50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prep_time">Prep Time (minutes)</Label>
                <Input
                  id="prep_time"
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, prep_time: e.target.value }))}
                  placeholder="3"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData(prev => ({ ...prev, servings: e.target.value }))}
                  placeholder="1"
                  required
                />
              </div>
            </div>

            {/* Ingredients */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Ingredients</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>

              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Inventory Item</Label>
                      <Select
                        value={ingredient.inventory_item_id}
                        onValueChange={(value) => updateIngredient(index, 'inventory_item_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableInventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                        placeholder="2"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Modifiers */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Modifiers</Label>
                <Button type="button" variant="outline" size="sm" onClick={addModifier}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Modifier
                </Button>
              </div>

              <div className="space-y-3">
                {modifiers.map((modifier, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Inventory Item</Label>
                      <Select
                        value={modifier.inventory_item_id}
                        onValueChange={(value) => updateModifier(index, 'inventory_item_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select inventory item" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableInventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (${item.cost_per_unit?.toFixed(2) || '0.00'}/{item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-32 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={modifier.quantity}
                        onChange={(e) => updateModifier(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="1"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeModifier(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Instructions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Step {index + 1}</Label>
                      <Input
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        placeholder="Enter instruction step"
                      />
                    </div>

                    {instructions.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeInstruction(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

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
                  "Add Recipe"
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;