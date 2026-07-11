import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit3, Ruler, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecipeSize {
  id: string;
  name: string;
  price_adjustment: number;
  ingredient_multiplier: number;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  inventory_item_id?: string | null;
}

interface RecipeSizesManagerProps {
  recipeId: string;
  hasSizes: boolean;
  onHasSizesChange: (hasSizes: boolean) => void;
}

const RecipeSizesManager = ({ recipeId, hasSizes, onHasSizesChange }: RecipeSizesManagerProps) => {
  const [sizes, setSizes] = useState<RecipeSize[]>([]);
  const [editingSize, setEditingSize] = useState<RecipeSize | null>(null);
  const [newSize, setNewSize] = useState({
    name: "",
    price_adjustment: "0",
    ingredient_multiplier: "1",
    inventory_item_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [sizeIngredientOverrides, setSizeIngredientOverrides] = useState<Record<string, Record<string, number>>>({});
  const [expandedSizes, setExpandedSizes] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    if (recipeId && hasSizes) {
      loadSizes();
      loadRecipeIngredients();
      loadSizeIngredientOverrides();
    }
  }, [recipeId, hasSizes]);

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit, category')
        .order('name');

      if (error) throw error;
      const filtered = (data || []).filter((item: any) => {
        const cat = (item.category || '').toString().toLowerCase().trim();
        return cat === 'cup/container' || cat === 'cup' || cat === 'container' || cat === 'cups/containers';
      });
      setInventoryItems(filtered);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const loadRecipeIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('id, quantity, inventory_item_id, inventory_items ( id, name, unit )')
        .eq('recipe_id', recipeId);
      if (error) throw error;
      setRecipeIngredients(data || []);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
    }
  };

  const loadSizeIngredientOverrides = async () => {
    try {
      const { data: sizesData } = await supabase
        .from('recipe_sizes')
        .select('id')
        .eq('recipe_id', recipeId);
      const sizeIds = (sizesData || []).map((s: any) => s.id);
      if (sizeIds.length === 0) {
        setSizeIngredientOverrides({});
        return;
      }
      const { data, error } = await (supabase as any)
        .from('recipe_size_ingredients')
        .select('recipe_size_id, inventory_item_id, quantity')
        .in('recipe_size_id', sizeIds);
      if (error) throw error;
      const map: Record<string, Record<string, number>> = {};
      for (const row of data || []) {
        if (!map[row.recipe_size_id]) map[row.recipe_size_id] = {};
        map[row.recipe_size_id][row.inventory_item_id] = Number(row.quantity);
      }
      setSizeIngredientOverrides(map);
    } catch (error) {
      console.error('Error loading size ingredient overrides:', error);
    }
  };

  const getEffectiveQuantity = (size: RecipeSize, ingredient: any): number => {
    const override = sizeIngredientOverrides[size.id]?.[ingredient.inventory_item_id];
    if (override !== undefined) return override;
    return Number(ingredient.quantity) * Number(size.ingredient_multiplier || 1);
  };

  const setSizeIngredientQuantity = async (sizeId: string, inventoryItemId: string, quantity: number) => {
    setSizeIngredientOverrides(prev => ({
      ...prev,
      [sizeId]: { ...(prev[sizeId] || {}), [inventoryItemId]: quantity },
    }));
    try {
      const { error } = await (supabase as any)
        .from('recipe_size_ingredients')
        .upsert(
          { recipe_size_id: sizeId, inventory_item_id: inventoryItemId, quantity },
          { onConflict: 'recipe_size_id,inventory_item_id' }
        );
      if (error) throw error;
    } catch (error) {
      console.error('Error saving size ingredient override:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save ingredient quantity for this size.',
      });
      await loadSizeIngredientOverrides();
    }
  };

  const resetSizeIngredientOverride = async (sizeId: string, inventoryItemId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('recipe_size_ingredients')
        .delete()
        .eq('recipe_size_id', sizeId)
        .eq('inventory_item_id', inventoryItemId);
      if (error) throw error;
      setSizeIngredientOverrides(prev => {
        const next = { ...prev };
        if (next[sizeId]) {
          const inner = { ...next[sizeId] };
          delete inner[inventoryItemId];
          next[sizeId] = inner;
        }
        return next;
      });
    } catch (error) {
      console.error('Error resetting override:', error);
    }
  };

  const loadSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_sizes')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('sort_order');

      if (error) throw error;
      setSizes(data || []);
    } catch (error) {
      console.error('Error loading sizes:', error);
    }
  };

  const addSize = async () => {
    if (!newSize.name.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('recipe_sizes')
        .insert({
          recipe_id: recipeId,
          name: newSize.name.trim(),
          price_adjustment: parseFloat(newSize.price_adjustment) || 0,
          ingredient_multiplier: parseFloat(newSize.ingredient_multiplier) || 1,
          sort_order: sizes.length,
          is_default: sizes.length === 0,
          inventory_item_id: newSize.inventory_item_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSizes([...sizes, data]);
      setNewSize({ name: "", price_adjustment: "0", ingredient_multiplier: "1", inventory_item_id: "" });

      toast({
        title: "Success",
        description: "Size added successfully.",
      });
    } catch (error) {
      console.error('Error adding size:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add size.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSize = async () => {
    if (!editingSize) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('recipe_sizes')
        .update({
          name: editingSize.name,
          price_adjustment: editingSize.price_adjustment,
          ingredient_multiplier: editingSize.ingredient_multiplier,
          is_default: editingSize.is_default,
          inventory_item_id: editingSize.inventory_item_id || null,
        })
        .eq('id', editingSize.id);

      if (error) throw error;

      if (editingSize.is_default) {
        await supabase
          .from('recipe_sizes')
          .update({ is_default: false })
          .eq('recipe_id', recipeId)
          .neq('id', editingSize.id);
      }

      await loadSizes();
      setEditingSize(null);

      toast({
        title: "Success",
        description: "Size updated successfully.",
      });
    } catch (error) {
      console.error('Error updating size:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update size.",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSize = async (sizeId: string) => {
    try {
      const { error } = await supabase
        .from('recipe_sizes')
        .delete()
        .eq('id', sizeId);

      if (error) throw error;

      setSizes(sizes.filter(s => s.id !== sizeId));

      toast({
        title: "Success",
        description: "Size deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting size:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete size.",
      });
    }
  };

  const setAsDefault = async (sizeId: string) => {
    try {
      await supabase
        .from('recipe_sizes')
        .update({ is_default: false })
        .eq('recipe_id', recipeId);

      await supabase
        .from('recipe_sizes')
        .update({ is_default: true })
        .eq('id', sizeId);

      await loadSizes();

      toast({
        title: "Success",
        description: "Default size updated.",
      });
    } catch (error) {
      console.error('Error setting default size:', error);
    }
  };

  const updateSizeInventoryItem = async (sizeId: string, inventoryItemId: string | null) => {
    // Optimistic update
    setSizes(prev => prev.map(s => s.id === sizeId ? { ...s, inventory_item_id: inventoryItemId } : s));
    try {
      const { error } = await supabase
        .from('recipe_sizes')
        .update({ inventory_item_id: inventoryItemId })
        .eq('id', sizeId);
      if (error) throw error;
      toast({
        title: "Saved",
        description: inventoryItemId ? "Cup/container linked to size." : "Cup/container removed from size.",
      });
    } catch (error) {
      console.error('Error updating size cup/container:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update cup/container.",
      });
      await loadSizes();
    }
  };

  const handleToggleSizes = async (enabled: boolean) => {
    onHasSizesChange(enabled);
    
    if (enabled && sizes.length === 0) {
      try {
        const defaultSizes = [
          { name: 'Small', price_adjustment: -0.50, ingredient_multiplier: 0.75, sort_order: 0, is_default: false },
          { name: 'Medium', price_adjustment: 0, ingredient_multiplier: 1, sort_order: 1, is_default: true },
          { name: 'Large', price_adjustment: 0.75, ingredient_multiplier: 1.5, sort_order: 2, is_default: false },
        ];

        for (const size of defaultSizes) {
          await supabase
            .from('recipe_sizes')
            .insert({
              recipe_id: recipeId,
              ...size
            });
        }

        await loadSizes();
        await loadRecipeIngredients();
      } catch (error) {
        console.error('Error creating default sizes:', error);
      }
    }
  };

  const getInventoryItemName = (id: string | null | undefined) => {
    if (!id) return null;
    const item = inventoryItems.find(i => i.id === id);
    return item ? `${item.name} (${item.unit})` : null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Size Options
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="has-sizes" className="text-sm text-muted-foreground">
              Enable Sizes
            </Label>
            <Switch
              id="has-sizes"
              checked={hasSizes}
              onCheckedChange={handleToggleSizes}
            />
          </div>
        </div>
      </CardHeader>

      {hasSizes && (
        <CardContent className="space-y-4">
          {/* Add new size */}
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Size Name</Label>
                <Input
                  placeholder="e.g., Large"
                  value={newSize.name}
                  onChange={(e) => setNewSize(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Price +/-</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newSize.price_adjustment}
                  onChange={(e) => setNewSize(prev => ({ ...prev, price_adjustment: e.target.value }))}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1.0"
                  value={newSize.ingredient_multiplier}
                  onChange={(e) => setNewSize(prev => ({ ...prev, ingredient_multiplier: e.target.value }))}
                />
              </div>
              <Button type="button" onClick={addSize} size="sm" disabled={loading}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cup / Container (from inventory)</Label>
              <Select
                value={newSize.inventory_item_id}
                onValueChange={(value) => setNewSize(prev => ({ ...prev, inventory_item_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cup/container (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Existing sizes */}
          <ScrollArea className="h-[300px] rounded-md border p-2">
            <div className="space-y-2 pr-2">
              {sizes.map((size) => (
                <div key={size.id} className="flex flex-col gap-2 p-2 border rounded">
                  {editingSize?.id === size.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingSize.name}
                          onChange={(e) => setEditingSize(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={editingSize.price_adjustment}
                          onChange={(e) => setEditingSize(prev => prev ? { ...prev, price_adjustment: parseFloat(e.target.value) || 0 } : null)}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={editingSize.ingredient_multiplier}
                          onChange={(e) => setEditingSize(prev => prev ? { ...prev, ingredient_multiplier: parseFloat(e.target.value) || 1 } : null)}
                          className="w-20"
                        />
                      </div>
                      <Select
                        value={editingSize.inventory_item_id || "none"}
                        onValueChange={(value) => setEditingSize(prev => prev ? { ...prev, inventory_item_id: value === "none" ? null : value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select cup/container" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" size="sm" onClick={updateSize} disabled={loading}>
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditingSize(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{size.name}</span>
                        {size.is_default && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                        <Badge variant={size.price_adjustment >= 0 ? "secondary" : "outline"} className="text-xs">
                          {size.price_adjustment >= 0 ? '+' : ''}{size.price_adjustment.toFixed(2)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          x{size.ingredient_multiplier.toFixed(1)}
                        </Badge>
                        {size.inventory_item_id && (
                          <Badge variant="secondary" className="text-xs">
                            🥤 {getInventoryItemName(size.inventory_item_id)}
                          </Badge>
                        )}
                      </div>
                      {!size.is_default && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAsDefault(size.id)}
                          className="text-xs"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingSize(size)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSize(size.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <Label className="text-xs whitespace-nowrap text-muted-foreground">Cup/Container:</Label>
                      <Select
                        value={size.inventory_item_id || "none"}
                        onValueChange={(value) => updateSizeInventoryItem(size.id, value === "none" ? null : value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pl-6">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setExpandedSizes(prev => ({ ...prev, [size.id]: !prev[size.id] }))}
                      >
                        {expandedSizes[size.id] ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                        Ingredients ({recipeIngredients.length})
                      </Button>
                      {expandedSizes[size.id] && (
                        <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
                          {recipeIngredients.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No ingredients on this recipe yet. Add ingredients first.
                            </p>
                          )}
                          {recipeIngredients.map((ing) => {
                            const hasOverride =
                              sizeIngredientOverrides[size.id]?.[ing.inventory_item_id] !== undefined;
                            const effective = getEffectiveQuantity(size, ing);
                            const unit = ing.inventory_items?.unit || '';
                            const name = ing.inventory_items?.name || 'Ingredient';
                            return (
                              <div key={ing.id} className="flex items-center gap-2">
                                <span className="flex-1 text-xs truncate">{name}</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={effective}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setSizeIngredientOverrides(prev => ({
                                      ...prev,
                                      [size.id]: {
                                        ...(prev[size.id] || {}),
                                        [ing.inventory_item_id]: isNaN(v) ? 0 : v,
                                      },
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setSizeIngredientQuantity(
                                      size.id,
                                      ing.inventory_item_id,
                                      isNaN(v) ? 0 : v
                                    );
                                  }}
                                  className="h-7 w-24 text-xs"
                                />
                                <span className="text-xs text-muted-foreground w-10">{unit}</span>
                                {hasOverride && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => resetSizeIngredientOverride(size.id, ing.inventory_item_id)}
                                    title="Reset to multiplier default"
                                  >
                                    Reset
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                          <p className="text-[10px] text-muted-foreground">
                            Default = base quantity × multiplier ({size.ingredient_multiplier}). Edit to override per size.
                          </p>
                        </div>
                      )}
                    </div>
                    </>
                  )}
                </div>
              ))}
              {sizes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sizes added yet. Add your first size above.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
};

export default RecipeSizesManager;
