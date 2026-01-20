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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Edit3, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RecipeSizesManager from "./RecipeSizesManager";

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
    has_sizes: false,
  });
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [editingModifier, setEditingModifier] = useState<any>(null);
  const [newModifier, setNewModifier] = useState({ inventory_item_id: "", quantity: "1" });
  
  // Ingredients state
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [newIngredient, setNewIngredient] = useState({ inventory_item_id: "", quantity: "1" });
  
  const [availableInventoryItems, setAvailableInventoryItems] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

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
        has_sizes: recipe.has_sizes || false,
      });
      loadRecipeModifiers();
      loadRecipeIngredients();
      setNewModifier({ inventory_item_id: "", quantity: "1" });
      setNewIngredient({ inventory_item_id: "", quantity: "1" });
    }
  }, [recipe]);

  const loadRecipeIngredients = async () => {
    if (!recipe?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*, inventory_item:inventory_items(*)')
        .eq('recipe_id', recipe.id);

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
    }
  };

  const loadRecipeModifiers = async () => {
    if (!recipe?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('recipe_modifiers')
        .select('*, inventory_item:inventory_items(*)')
        .eq('recipe_id', recipe.id);

      if (error) throw error;
      setModifiers(data || []);
    } catch (error) {
      console.error('Error loading recipe modifiers:', error);
    }
  };

  // Ingredient management functions
  const addIngredient = async () => {
    if (!newIngredient.inventory_item_id || !newIngredient.quantity) return;
    
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipe.id,
          inventory_item_id: newIngredient.inventory_item_id,
          quantity: parseFloat(newIngredient.quantity)
        })
        .select('*, inventory_item:inventory_items(*)')
        .single();

      if (error) throw error;

      setIngredients([...ingredients, data]);
      setNewIngredient({ inventory_item_id: "", quantity: "1" });
      
      toast({
        title: "Success",
        description: "Ingredient added successfully.",
      });
    } catch (error) {
      console.error("Error adding ingredient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add ingredient.",
      });
    }
  };

  const updateIngredient = async (ingredientId: string, inventory_item_id: string, quantity: string) => {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update({
          inventory_item_id: inventory_item_id,
          quantity: parseFloat(quantity)
        })
        .eq('id', ingredientId);

      if (error) throw error;

      // Reload ingredients to get updated data with inventory item info
      const { data: updatedIngredients, error: fetchError } = await supabase
        .from('recipe_ingredients')
        .select('*, inventory_item:inventory_items(*)')
        .eq('recipe_id', recipe.id);

      if (!fetchError) {
        setIngredients(updatedIngredients || []);
      }
      
      setEditingIngredient(null);
      
      toast({
        title: "Success",
        description: "Ingredient updated successfully.",
      });
    } catch (error) {
      console.error("Error updating ingredient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update ingredient.",
      });
    }
  };

  const deleteIngredient = async (ingredientId: string) => {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;

      setIngredients(ingredients.filter(ing => ing.id !== ingredientId));
      
      toast({
        title: "Success",
        description: "Ingredient deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete ingredient.",
      });
    }
  };

  const addModifier = async () => {
    if (!newModifier.inventory_item_id || !newModifier.quantity) return;
    
    try {
      const { data, error } = await supabase
        .from('recipe_modifiers')
        .insert({
          recipe_id: recipe.id,
          inventory_item_id: newModifier.inventory_item_id,
          quantity: parseFloat(newModifier.quantity),
          is_active: true
        })
        .select('*, inventory_item:inventory_items(*)')
        .single();

      if (error) throw error;

      setModifiers([...modifiers, data]);
      setNewModifier({ inventory_item_id: "", quantity: "1" });
      
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

  const updateModifier = async (modifierId: string, inventory_item_id: string, quantity: string) => {
    try {
      const { error } = await supabase
        .from('recipe_modifiers')
        .update({
          inventory_item_id: inventory_item_id,
          quantity: parseFloat(quantity)
        })
        .eq('id', modifierId);

      if (error) throw error;

      // Reload modifiers to get updated data with inventory item info
      const { data: updatedModifiers, error: fetchError } = await supabase
        .from('recipe_modifiers')
        .select('*, inventory_item:inventory_items(*)')
        .eq('recipe_id', recipe.id);

      if (!fetchError) {
        setModifiers(updatedModifiers || []);
      }
      
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
          has_sizes: formData.has_sizes,
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
                <SelectItem value="consumables">Consumables</SelectItem>
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

          {/* Recipe Sizes */}
          {recipe?.id && (
            <RecipeSizesManager
              recipeId={recipe.id}
              hasSizes={formData.has_sizes}
              onHasSizesChange={(hasSizes) => setFormData(prev => ({ ...prev, has_sizes: hasSizes }))}
            />
          )}

          <Separator />

          {/* Recipe Ingredients Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recipe Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new ingredient */}
              <div className="flex gap-2">
                <Select
                  value={newIngredient.inventory_item_id}
                  onValueChange={(value) => setNewIngredient(prev => ({ ...prev, inventory_item_id: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-20"
                />
                <Button type="button" onClick={addIngredient} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Existing ingredients */}
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="flex items-center gap-2 p-2 border rounded">
                      {editingIngredient?.id === ingredient.id ? (
                        <>
                          <Select
                            value={editingIngredient.inventory_item_id}
                            onValueChange={(value) => setEditingIngredient(prev => ({ ...prev, inventory_item_id: value }))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableInventoryItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({item.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            value={editingIngredient.quantity}
                            onChange={(e) => setEditingIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                            className="w-20"
                          />
                          <Button 
                            type="button"
                            size="sm" 
                            onClick={() => updateIngredient(ingredient.id, editingIngredient.inventory_item_id, editingIngredient.quantity)}
                          >
                            Save
                          </Button>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="outline" 
                            onClick={() => setEditingIngredient(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="font-medium">
                              {ingredient.inventory_item?.name || 'Unknown Item'}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {ingredient.quantity} {ingredient.inventory_item?.unit || ''}
                            </Badge>
                          </div>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="ghost"
                            onClick={() => setEditingIngredient({ 
                              id: ingredient.id, 
                              inventory_item_id: ingredient.inventory_item_id, 
                              quantity: ingredient.quantity.toString() 
                            })}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteIngredient(ingredient.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  {ingredients.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No ingredients added yet. Add your first ingredient above.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recipe Modifiers Card */}
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
                <Select
                  value={newModifier.inventory_item_id}
                  onValueChange={(value) => setNewModifier(prev => ({ ...prev, inventory_item_id: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (${item.cost_per_unit.toFixed(2)}/{item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Quantity"
                  value={newModifier.quantity}
                  onChange={(e) => setNewModifier(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-24"
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
                        <Select
                          value={editingModifier.inventory_item_id}
                          onValueChange={(value) => setEditingModifier(prev => ({ ...prev, inventory_item_id: value }))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableInventoryItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} (${item.cost_per_unit.toFixed(2)}/{item.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingModifier.quantity}
                          onChange={(e) => setEditingModifier(prev => ({ ...prev, quantity: e.target.value }))}
                          className="w-24"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => updateModifier(modifier.id, editingModifier.inventory_item_id, editingModifier.quantity)}
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
                          <span className="font-medium">
                            {modifier.inventory_item?.name || 'Unknown Item'}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {modifier.quantity} {modifier.inventory_item?.unit || ''}
                          </Badge>
                          <Badge variant="outline" className="ml-1">
                            ${((modifier.inventory_item?.cost_per_unit || 0) * modifier.quantity).toFixed(2)}
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setEditingModifier({ 
                            id: modifier.id, 
                            inventory_item_id: modifier.inventory_item_id, 
                            quantity: modifier.quantity.toString() 
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