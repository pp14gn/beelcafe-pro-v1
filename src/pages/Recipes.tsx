import { useState } from "react";
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
import AddRecipeDialog from "@/components/AddRecipeDialog";
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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const recipes: Recipe[] = [
    {
      id: "1",
      name: "Classic Latte",
      category: "coffee",
      description: "Rich espresso with steamed milk and light foam",
      basePrice: 4.50,
      prepTime: 3,
      servings: 1,
      ingredients: [
        { name: "Espresso Shot", quantity: 2, unit: "shots" },
        { name: "Whole Milk", quantity: 6, unit: "oz" },
        { name: "Milk Foam", quantity: 1, unit: "oz" }
      ],
      modifiers: [
        { name: "Extra Shot", price: 0.75, ingredients: [{ name: "Espresso Shot", quantity: 1, unit: "shot" }] },
        { name: "Oat Milk", price: 0.60, ingredients: [{ name: "Oat Milk", quantity: 6, unit: "oz" }] },
        { name: "Vanilla Syrup", price: 0.50, ingredients: [{ name: "Vanilla Syrup", quantity: 0.5, unit: "oz" }] },
        { name: "Decaf", price: 0.00 }
      ],
      instructions: [
        "Grind coffee beans to fine consistency",
        "Pull 2 shots of espresso into cup",
        "Steam milk to 150-160°F with microfoam",
        "Pour steamed milk into espresso",
        "Top with light layer of foam",
        "Serve immediately"
      ]
    },
    {
      id: "2",
      name: "Cappuccino",
      category: "coffee",
      description: "Equal parts espresso, steamed milk, and foam",
      basePrice: 4.00,
      prepTime: 4,
      servings: 1,
      ingredients: [
        { name: "Espresso Shot", quantity: 2, unit: "shots" },
        { name: "Whole Milk", quantity: 4, unit: "oz" },
        { name: "Milk Foam", quantity: 2, unit: "oz" }
      ],
      modifiers: [
        { name: "Extra Shot", price: 0.75 },
        { name: "Decaf", price: 0.00 },
        { name: "Extra Foam", price: 0.00 },
        { name: "Cinnamon", price: 0.25 }
      ],
      instructions: [
        "Pull 2 shots of espresso",
        "Steam milk with extra foam",
        "Pour equal parts steamed milk and foam",
        "Dust with cinnamon if requested"
      ]
    },
    {
      id: "3",
      name: "Breakfast Sandwich", 
      category: "food",
      description: "Egg, cheese, and choice of meat on toasted bagel",
      basePrice: 7.25,
      prepTime: 6,
      servings: 1,
      ingredients: [
        { name: "Everything Bagel", quantity: 1, unit: "piece" },
        { name: "Scrambled Eggs", quantity: 2, unit: "eggs" },
        { name: "Cheddar Cheese", quantity: 1, unit: "slice" },
        { name: "Turkey Sausage", quantity: 1, unit: "patty" }
      ],
      modifiers: [
        { name: "Bacon", price: 1.00, ingredients: [{ name: "Bacon", quantity: 2, unit: "strips" }] },
        { name: "Ham", price: 0.75, ingredients: [{ name: "Ham", quantity: 1, unit: "slice" }] },
        { name: "Avocado", price: 1.25, ingredients: [{ name: "Avocado", quantity: 0.25, unit: "piece" }] },
        { name: "No Cheese", price: -0.50 }
      ],
      instructions: [
        "Toast bagel halves until golden",
        "Scramble eggs with salt and pepper",
        "Cook meat patty/strips until done",
        "Assemble sandwich with cheese",
        "Serve hot"
      ]
    }
  ];

  const categories = [
    { id: "all", name: "All Recipes" },
    { id: "coffee", name: "Coffee" },
    { id: "food", name: "Food" },
    { id: "pastries", name: "Pastries" }
  ];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                {Math.round(recipes.reduce((sum, r) => sum + r.modifiers.length, 0) / recipes.length)}
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
                  <span className="font-semibold text-coffee-gold">${recipe.basePrice.toFixed(2)}</span>
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Modifiers:</span>
                    <Badge variant="secondary">{recipe.modifiers.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recipe.modifiers.slice(0, 3).map((modifier, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {modifier.name}
                      </Badge>
                    ))}
                    {recipe.modifiers.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{recipe.modifiers.length - 3} more
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
                              ${selectedRecipe.basePrice.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              {selectedRecipe.prepTime}m prep
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Ingredients</h4>
                          <div className="space-y-2">
                            {selectedRecipe.ingredients.map((ingredient, index) => (
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedRecipe.modifiers.map((modifier, index) => (
                              <div key={index} className="border border-border rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium">{modifier.name}</span>
                                  <span className="text-coffee-gold font-semibold">
                                    {modifier.price > 0 ? `+$${modifier.price.toFixed(2)}` : 
                                     modifier.price < 0 ? `-$${Math.abs(modifier.price).toFixed(2)}` : 
                                     'Free'}
                                  </span>
                                </div>
                                {modifier.ingredients && (
                                  <div className="text-xs text-muted-foreground">
                                    {modifier.ingredients.map(ing => 
                                      `${ing.quantity} ${ing.unit} ${ing.name}`
                                    ).join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Instructions</h4>
                          <div className="space-y-2">
                            {selectedRecipe.instructions.map((instruction, index) => (
                              <div key={index} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-coffee-gold/20 text-coffee-gold rounded-full flex items-center justify-center text-sm font-semibold">
                                  {index + 1}
                                </span>
                                <span className="text-sm">{instruction}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
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
        onSuccess={() => {
          // You could reload recipes data here
          console.log('Recipe added successfully');
        }}
      />
    </div>
  );
};

export default Recipes;