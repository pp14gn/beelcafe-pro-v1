import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddRecipeDialog from "@/components/AddRecipeDialog";
import EditRecipeDialog from "@/components/EditRecipeDialog";
import { 
  ChefHat, 
  Plus, 
  Search, 
  Coffee,
  Clock,
  Users,
  Settings,
  Edit,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface Modifier {
  name: string;
  price: number;
  ingredients?: Ingredient[];
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  prepTime: number;
  servings: number;
  ingredients: Ingredient[];
  modifiers: Modifier[];
  instructions: string[];
}

const Recipes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_modifiers(*),
          recipe_ingredients(
            quantity,
            inventory_items(
              name,
              unit
            )
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Transform the data to match the frontend interface
      const transformedRecipes = (data || []).map(recipe => ({
        ...recipe,
        basePrice: Number(recipe.base_price),
        prepTime: recipe.prep_time || 0,
        ingredients: recipe.recipe_ingredients?.map(ri => ({
          name: ri.inventory_items?.name || 'Unknown',
          quantity: Number(ri.quantity),
          unit: ri.inventory_items?.unit || 'unit'
        })) || []
      }));
      
      setRecipes(transformedRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load recipes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (recipe: any) => {
    setSelectedRecipe(recipe);
    setEditDialogOpen(true);
  };

  const handleDelete = (recipe: any) => {
    setSelectedRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecipe) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', selectedRecipe.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recipe deleted successfully.",
      });

      loadRecipes();
      setDeleteDialogOpen(false);
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete recipe.",
      });
    }
  };

  const handleDialogSuccess = () => {
    loadRecipes();
  };

  const categories = [
    { id: "all", name: "All Recipes" },
    { id: "coffee", name: "Coffee" },
    { id: "food", name: "Food" },
    { id: "pastries", name: "Pastries" }
  ];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (recipe.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipe Manager</h1>
          <p className="text-muted-foreground">Manage recipes, ingredients, and modifiers</p>
        </div>
        <Button 
          className="gap-2 bg-gradient-coffee hover:opacity-90"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Recipe
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-coffee-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recipes</p>
              <p className="text-2xl font-bold text-coffee-gold">{recipes.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-bean/10 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-coffee-bean" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Coffee Recipes</p>
              <p className="text-2xl font-bold text-coffee-bean">
                {recipes.filter(r => r.category === "coffee").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-pos-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Modifiers</p>
              <p className="text-2xl font-bold text-pos-info">
                {recipes.length > 0 ? Math.round(recipes.reduce((sum, r) => sum + (r.recipe_modifiers?.length || 0), 0) / recipes.length) : 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-1">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden hover:shadow-coffee transition-all duration-200">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{recipe.name}</h3>
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {recipe.category}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {recipe.prepTime}m
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {recipe.servings}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Base Price:</span>
                  <span className="font-semibold text-coffee-gold">${recipe.basePrice?.toFixed(2) || '0.00'}</span>
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Modifiers:</span>
                    <Badge variant="secondary">{recipe.recipe_modifiers?.length || 0}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(recipe.recipe_modifiers || []).slice(0, 3).map((modifier: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {modifier.name}
                      </Badge>
                    ))}
                    {(recipe.recipe_modifiers?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(recipe.recipe_modifiers?.length || 0) - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 bg-muted/30">
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        {selectedRecipe?.name}
                      </DialogTitle>
                    </DialogHeader>
                    
                    {selectedRecipe && (
                      <div className="space-y-6">
                        <div>
                          <p className="text-muted-foreground">{selectedRecipe.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <Badge variant="outline" className="capitalize">
                              {selectedRecipe.category}
                            </Badge>
                            <span className="text-coffee-gold font-semibold">
                              ${selectedRecipe.basePrice?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-muted-foreground">
                              {selectedRecipe.prepTime}m prep
                            </span>
                          </div>
                        </div>

                          <div>
                            <h4 className="font-semibold mb-3">Ingredients</h4>
                            <div className="space-y-2">
                              {(selectedRecipe.ingredients || []).map((ingredient, index) => (
                                <div key={index} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg">
                                  <span>{ingredient.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {ingredient.quantity} {ingredient.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                        <div>
                          <h4 className="font-semibold mb-3">Available Modifiers</h4>
                          {selectedRecipe?.recipe_modifiers?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedRecipe.recipe_modifiers.map((modifier: any, index: number) => (
                                <div key={index} className="border border-border rounded-lg p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium">{modifier.name}</span>
                                    <span className="text-coffee-gold font-semibold">
                                      {modifier.price > 0 ? `+$${modifier.price?.toFixed(2) || '0.00'}` : 
                                       modifier.price < 0 ? `-$${Math.abs(modifier.price)?.toFixed(2) || '0.00'}` : 
                                       'Free'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No modifiers available</p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Instructions</h4>
                          {selectedRecipe?.instructions && Array.isArray(selectedRecipe.instructions) ? (
                            <div className="space-y-2">
                              {selectedRecipe.instructions.map((instruction: string, index: number) => (
                                <div key={index} className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-coffee-gold/20 text-coffee-gold rounded-full flex items-center justify-center text-sm font-semibold">
                                    {index + 1}
                                  </span>
                                  <span className="text-sm">{instruction}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No instructions available</p>
                          )}
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(recipe)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDelete(recipe)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Recipe Dialog */}
      <AddRecipeDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleDialogSuccess}
      />

      {/* Edit Recipe Dialog */}
      <EditRecipeDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        recipe={selectedRecipe}
      />

      {/* Delete Recipe Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRecipe?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Recipes;