import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Package, Gift, Percent, Calendar, X } from "lucide-react";
import { format } from "date-fns";

interface ComboPromotion {
  id: string;
  name: string;
  description: string | null;
  promotion_type: string;
  discount_type: string;
  discount_value: number;
  min_quantity: number;
  free_quantity: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  items?: ComboItem[];
}

interface ComboItem {
  id: string;
  recipe_id: string;
  recipe_name?: string;
  quantity_required: number;
  is_free_item: boolean;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
}

export const ComboPromotionsManager = () => {
  const [combos, setCombos] = useState<ComboPromotion[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboPromotion | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    promotion_type: "bundle",
    discount_type: "percentage",
    discount_value: 0,
    min_quantity: 1,
    free_quantity: 0,
    start_date: "",
    end_date: "",
    is_active: true,
    items: [] as { recipe_id: string; quantity_required: number; is_free_item: boolean }[],
  });

  useEffect(() => {
    loadCombos();
    loadRecipes();
  }, []);

  const loadCombos = async () => {
    try {
      const { data: combosData, error } = await supabase
        .from('combo_promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const combosWithItems = await Promise.all(
        (combosData || []).map(async (combo) => {
          const { data: itemsData } = await supabase
            .from('combo_promotion_items')
            .select('id, recipe_id, quantity_required, is_free_item')
            .eq('combo_promotion_id', combo.id);

          const itemsWithRecipes = await Promise.all(
            (itemsData || []).map(async (item) => {
              const { data: recipeData } = await supabase
                .from('recipes')
                .select('name')
                .eq('id', item.recipe_id)
                .maybeSingle();
              return { ...item, recipe_name: recipeData?.name || 'Unknown' };
            })
          );

          return { ...combo, items: itemsWithRecipes };
        })
      );

      setCombos(combosWithItems);
    } catch (error) {
      console.error('Error loading combos:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load combo promotions." });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, category')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      promotion_type: "bundle",
      discount_type: "percentage",
      discount_value: 0,
      min_quantity: 1,
      free_quantity: 0,
      start_date: "",
      end_date: "",
      is_active: true,
      items: [],
    });
    setEditingCombo(null);
  };

  const handleEdit = (combo: ComboPromotion) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || "",
      promotion_type: combo.promotion_type,
      discount_type: combo.discount_type,
      discount_value: Number(combo.discount_value),
      min_quantity: combo.min_quantity || 1,
      free_quantity: combo.free_quantity || 0,
      start_date: combo.start_date.split('T')[0],
      end_date: combo.end_date.split('T')[0],
      is_active: combo.is_active,
      items: combo.items?.map(i => ({
        recipe_id: i.recipe_id,
        quantity_required: i.quantity_required,
        is_free_item: i.is_free_item,
      })) || [],
    });
    setDialogOpen(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { recipe_id: "", quantity_required: 1, is_free_item: false }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: string | number | boolean) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || formData.items.length === 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill in all required fields and add at least one item." });
      return;
    }

    try {
      const comboData = {
        name: formData.name,
        description: formData.description || null,
        promotion_type: formData.promotion_type,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_quantity: formData.min_quantity,
        free_quantity: formData.free_quantity,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: formData.is_active,
      };

      let comboId: string;

      if (editingCombo) {
        const { error } = await supabase
          .from('combo_promotions')
          .update(comboData)
          .eq('id', editingCombo.id);
        if (error) throw error;
        comboId = editingCombo.id;

        await supabase
          .from('combo_promotion_items')
          .delete()
          .eq('combo_promotion_id', comboId);
      } else {
        const { data, error } = await supabase
          .from('combo_promotions')
          .insert(comboData)
          .select('id')
          .single();
        if (error) throw error;
        comboId = data.id;
      }

      if (formData.items.length > 0) {
        const itemsToInsert = formData.items.map(item => ({
          combo_promotion_id: comboId,
          recipe_id: item.recipe_id,
          quantity_required: item.quantity_required,
          is_free_item: item.is_free_item,
        }));

        const { error: itemError } = await supabase
          .from('combo_promotion_items')
          .insert(itemsToInsert);
        if (itemError) throw itemError;
      }

      toast({
        title: editingCombo ? "Combo Updated" : "Combo Created",
        description: `${formData.name} has been ${editingCombo ? 'updated' : 'created'} successfully.`,
      });

      resetForm();
      setDialogOpen(false);
      loadCombos();
    } catch (error) {
      console.error('Error saving combo:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save combo promotion." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('combo_promotions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Combo Deleted", description: "The combo promotion has been deleted." });
      loadCombos();
    } catch (error) {
      console.error('Error deleting combo:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete combo." });
    }
  };

  const toggleActive = async (combo: ComboPromotion) => {
    try {
      const { error } = await supabase
        .from('combo_promotions')
        .update({ is_active: !combo.is_active })
        .eq('id', combo.id);
      if (error) throw error;
      loadCombos();
    } catch (error) {
      console.error('Error toggling combo:', error);
    }
  };

  const isComboActive = (combo: ComboPromotion) => {
    const now = new Date();
    const start = new Date(combo.start_date);
    const end = new Date(combo.end_date);
    return combo.is_active && now >= start && now <= end;
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'buy_x_get_y': return 'Buy X Get Y Free';
      case 'bundle': return 'Bundle Discount';
      case 'quantity_discount': return 'Quantity Discount';
      default: return type;
    }
  };

  const getPromoTypeIcon = (type: string) => {
    switch (type) {
      case 'buy_x_get_y': return <Gift className="h-4 w-4" />;
      case 'bundle': return <Package className="h-4 w-4" />;
      case 'quantity_discount': return <Percent className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Combo Promotions</h3>
          <p className="text-sm text-muted-foreground">Create bundles, quantity discounts, and buy X get Y offers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingCombo ? 'Edit Combo Promotion' : 'Create Combo Promotion'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Breakfast Combo"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Coffee + Pastry for less"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Promotion Type</Label>
                    <Select
                      value={formData.promotion_type}
                      onValueChange={(value) => setFormData({ ...formData, promotion_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bundle">Bundle Discount</SelectItem>
                        <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                        <SelectItem value="quantity_discount">Quantity Discount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Discount Type</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discount_value">Discount Value</Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min="0"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {formData.promotion_type === 'quantity_discount' && (
                    <div>
                      <Label htmlFor="min_quantity">Min Quantity</Label>
                      <Input
                        id="min_quantity"
                        type="number"
                        min="1"
                        value={formData.min_quantity}
                        onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  )}

                  {formData.promotion_type === 'buy_x_get_y' && (
                    <div>
                      <Label htmlFor="free_quantity">Free Items</Label>
                      <Input
                        id="free_quantity"
                        type="number"
                        min="1"
                        value={formData.free_quantity}
                        onChange={(e) => setFormData({ ...formData, free_quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">Enable this combo promotion</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Items in Combo *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                  </div>

                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Add items to create this combo promotion
                    </p>
                  )}

                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                      <Select
                        value={item.recipe_id}
                        onValueChange={(value) => updateItem(index, 'recipe_id', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id}>
                              {recipe.name} ({recipe.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        value={item.quantity_required}
                        onChange={(e) => updateItem(index, 'quantity_required', parseInt(e.target.value) || 1)}
                      />

                      {formData.promotion_type === 'buy_x_get_y' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={item.is_free_item}
                            onChange={(e) => updateItem(index, 'is_free_item', e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-muted-foreground">Free</span>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit}>
                    {editingCombo ? 'Update' : 'Create'} Combo
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {combos.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No combo promotions created yet</p>
          <p className="text-sm text-muted-foreground">Create bundles and special offers</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {combos.map((combo) => (
            <Card key={combo.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getPromoTypeIcon(combo.promotion_type)}
                    <h4 className="font-semibold text-foreground">{combo.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {getPromoTypeLabel(combo.promotion_type)}
                    </Badge>
                    {isComboActive(combo) ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                    ) : combo.is_active ? (
                      <Badge variant="outline">Scheduled</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>

                  {combo.description && (
                    <p className="text-sm text-muted-foreground mb-2">{combo.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {combo.discount_type === 'percentage'
                        ? `${combo.discount_value}% off`
                        : `$${Number(combo.discount_value).toFixed(2)} off`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(combo.start_date), 'MMM d')} - {format(new Date(combo.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {combo.items && combo.items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {combo.items.map((item) => (
                        <Badge key={item.id} variant="outline" className="text-xs">
                          {item.quantity_required}x {item.recipe_name}
                          {item.is_free_item && ' (FREE)'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={combo.is_active}
                    onCheckedChange={() => toggleActive(combo)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(combo)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(combo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
