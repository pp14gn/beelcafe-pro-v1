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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Percent, DollarSign, Tag, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  min_purchase_amount: number;
  recipes?: { id: string; name: string }[];
}

interface Recipe {
  id: string;
  name: string;
  category: string;
}

export const PromotionsManager = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: 0,
    start_date: "",
    end_date: "",
    is_active: true,
    min_purchase_amount: 0,
    selected_recipes: [] as string[],
  });

  useEffect(() => {
    loadPromotions();
    loadRecipes();
  }, []);

  const loadPromotions = async () => {
    try {
      const { data: promotionsData, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load recipe associations for each promotion
      const promotionsWithRecipes = await Promise.all(
        (promotionsData || []).map(async (promo) => {
          const { data: recipeLinks } = await supabase
            .from('promotion_recipes')
            .select('recipe_id')
            .eq('promotion_id', promo.id);

          const recipeIds = recipeLinks?.map(r => r.recipe_id) || [];
          
          const { data: recipeData } = await supabase
            .from('recipes')
            .select('id, name')
            .in('id', recipeIds.length > 0 ? recipeIds : ['00000000-0000-0000-0000-000000000000']);

          return {
            ...promo,
            recipes: recipeData || [],
          };
        })
      );

      setPromotions(promotionsWithRecipes);
    } catch (error) {
      console.error('Error loading promotions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load promotions.",
      });
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
      discount_type: "percentage",
      discount_value: 0,
      start_date: "",
      end_date: "",
      is_active: true,
      min_purchase_amount: 0,
      selected_recipes: [],
    });
    setEditingPromotion(null);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      start_date: promo.start_date.split('T')[0],
      end_date: promo.end_date.split('T')[0],
      is_active: promo.is_active,
      min_purchase_amount: Number(promo.min_purchase_amount),
      selected_recipes: promo.recipes?.map(r => r.id) || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }

    try {
      const promotionData = {
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: formData.is_active,
        min_purchase_amount: formData.min_purchase_amount,
      };

      let promotionId: string;

      if (editingPromotion) {
        const { error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);

        if (error) throw error;
        promotionId = editingPromotion.id;

        // Delete existing recipe links
        await supabase
          .from('promotion_recipes')
          .delete()
          .eq('promotion_id', promotionId);
      } else {
        const { data, error } = await supabase
          .from('promotions')
          .insert(promotionData)
          .select('id')
          .single();

        if (error) throw error;
        promotionId = data.id;
      }

      // Insert recipe links
      if (formData.selected_recipes.length > 0) {
        const recipeLinks = formData.selected_recipes.map(recipeId => ({
          promotion_id: promotionId,
          recipe_id: recipeId,
        }));

        const { error: linkError } = await supabase
          .from('promotion_recipes')
          .insert(recipeLinks);

        if (linkError) throw linkError;
      }

      toast({
        title: editingPromotion ? "Promotion Updated" : "Promotion Created",
        description: `${formData.name} has been ${editingPromotion ? 'updated' : 'created'} successfully.`,
      });

      resetForm();
      setDialogOpen(false);
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save promotion.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Promotion Deleted",
        description: "The promotion has been deleted.",
      });

      loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete promotion.",
      });
    }
  };

  const toggleActive = async (promo: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  };

  const isPromotionActive = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    return promo.is_active && now >= start && now <= end;
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
          <h3 className="text-lg font-semibold text-foreground">Promotions</h3>
          <p className="text-sm text-muted-foreground">Manage discounts and special offers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingPromotion ? 'Edit Promotion' : 'Create Promotion'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Sale"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="20% off all beverages"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <Label htmlFor="discount_value">Discount Value</Label>
                    <div className="relative">
                      <Input
                        id="discount_value"
                        type="number"
                        min="0"
                        step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {formData.discount_type === 'percentage' ? '%' : '$'}
                      </span>
                    </div>
                  </div>
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

                <div>
                  <Label htmlFor="min_purchase">Minimum Purchase ($)</Label>
                  <Input
                    id="min_purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">Enable this promotion</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div>
                  <Label>Apply to Menu Items</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Leave empty to apply to all items, or select specific items
                  </p>
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="space-y-2">
                      {recipes.map((recipe) => (
                        <div key={recipe.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={recipe.id}
                            checked={formData.selected_recipes.includes(recipe.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  selected_recipes: [...formData.selected_recipes, recipe.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selected_recipes: formData.selected_recipes.filter(id => id !== recipe.id),
                                });
                              }
                            }}
                          />
                          <label htmlFor={recipe.id} className="text-sm cursor-pointer">
                            {recipe.name}
                            <span className="text-xs text-muted-foreground ml-1">({recipe.category})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit}>
                    {editingPromotion ? 'Update' : 'Create'} Promotion
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {promotions.length === 0 ? (
        <Card className="p-8 text-center">
          <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No promotions created yet</p>
          <p className="text-sm text-muted-foreground">Create your first promotion to offer discounts</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{promo.name}</h4>
                    {isPromotionActive(promo) ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                    ) : promo.is_active ? (
                      <Badge variant="outline">Scheduled</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  
                  {promo.description && (
                    <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {promo.discount_type === 'percentage' ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {promo.discount_type === 'percentage' 
                        ? `${promo.discount_value}% off`
                        : `$${Number(promo.discount_value).toFixed(2)} off`
                      }
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(promo.start_date), 'MMM d')} - {format(new Date(promo.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {promo.recipes && promo.recipes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {promo.recipes.slice(0, 3).map((recipe) => (
                        <Badge key={recipe.id} variant="outline" className="text-xs">
                          {recipe.name}
                        </Badge>
                      ))}
                      {promo.recipes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{promo.recipes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={promo.is_active}
                    onCheckedChange={() => toggleActive(promo)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(promo)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(promo.id)}
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
