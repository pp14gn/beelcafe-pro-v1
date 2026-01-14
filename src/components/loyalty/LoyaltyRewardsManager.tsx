import { useState, useEffect } from "react";
import { Plus, Gift, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: string;
  name: string;
  base_price: number;
  category: string;
}

interface Reward {
  id: string;
  recipe_id: string | null;
  name: string;
  points_cost: number;
  is_active: boolean;
  recipe?: Recipe;
}

const LoyaltyRewardsManager = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    recipe_id: "",
    name: "",
    points_cost: 0,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRewards();
    loadRecipes();
  }, []);

  const loadRewards = async () => {
    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .order('points_cost', { ascending: true });

    if (!error && data) {
      setRewards(data);
    }
  };

  const loadRecipes = async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, base_price, category')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setRecipes(data);
    }
  };

  const handleRecipeSelect = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      // Calculate points based on price (10 pts = $1)
      const pointsCost = Math.round(recipe.base_price * 10);
      setFormData({
        recipe_id: recipeId,
        name: recipe.name,
        points_cost: pointsCost,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingReward) {
        const { error } = await supabase
          .from('loyalty_rewards')
          .update({
            recipe_id: formData.recipe_id || null,
            name: formData.name,
            points_cost: formData.points_cost,
          })
          .eq('id', editingReward.id);

        if (error) throw error;
        toast({ title: "Reward updated successfully" });
      } else {
        const { error } = await supabase
          .from('loyalty_rewards')
          .insert({
            recipe_id: formData.recipe_id || null,
            name: formData.name,
            points_cost: formData.points_cost,
          });

        if (error) throw error;
        toast({ title: "Reward created successfully" });
      }

      loadRewards();
      closeDialog();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRewardActive = async (reward: Reward) => {
    const { error } = await supabase
      .from('loyalty_rewards')
      .update({ is_active: !reward.is_active })
      .eq('id', reward.id);

    if (!error) {
      loadRewards();
    }
  };

  const deleteReward = async (id: string) => {
    const { error } = await supabase
      .from('loyalty_rewards')
      .delete()
      .eq('id', id);

    if (!error) {
      loadRewards();
      toast({ title: "Reward deleted" });
    }
  };

  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      recipe_id: reward.recipe_id || "",
      name: reward.name,
      points_cost: reward.points_cost,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingReward(null);
    setFormData({ recipe_id: "", name: "", points_cost: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Redeemable Rewards</h3>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Reward
        </Button>
      </div>

      <div className="grid gap-3">
        {rewards.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            No rewards configured. Add menu items as redeemable rewards.
          </Card>
        ) : (
          rewards.map((reward) => (
            <Card key={reward.id} className={`p-3 ${!reward.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Gift className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{reward.name}</p>
                    <Badge variant="secondary">{reward.points_cost} pts</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={reward.is_active}
                    onCheckedChange={() => toggleRewardActive(reward)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(reward)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteReward(reward.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Edit Reward' : 'Add Reward'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Menu Item (Optional)</Label>
              <Select value={formData.recipe_id} onValueChange={handleRecipeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select from menu..." />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name} - ${recipe.base_price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Reward Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Free Coffee"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="points_cost">Points Cost *</Label>
              <Input
                id="points_cost"
                type="number"
                min={1}
                value={formData.points_cost}
                onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) || 0 })}
                required
              />
              <p className="text-xs text-muted-foreground">10 points = $1.00 value</p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {editingReward ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyaltyRewardsManager;