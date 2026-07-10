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
import { Plus, Trash2, Edit3, Ruler, GripVertical } from "lucide-react";
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
  const { toast } = useToast();

  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    if (recipeId && hasSizes) {
      loadSizes();
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
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-2">
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
