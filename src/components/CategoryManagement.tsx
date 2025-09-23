import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddCategoryDialog } from './AddCategoryDialog';
import { EditCategoryDialog } from './EditCategoryDialog';
import { AddUnitDialog } from './AddUnitDialog';
import { EditUnitDialog } from './EditUnitDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string | null;
  type: string;
  created_at: string;
}

export const CategoryManagement = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast({
        title: "Error",
        description: "Failed to fetch units",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.filter(c => c.id !== categoryId));
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);

      if (error) throw error;

      setUnits(units.filter(u => u.id !== unitId));
      toast({
        title: "Success",
        description: "Unit deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: "Error",
        description: "Failed to delete unit",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Only administrators can manage categories.</p>
        </CardContent>
      </Card>
    );
  }

  const recipeCategories = categories.filter(c => c.type === 'recipe');
  const inventoryCategories = categories.filter(c => c.type === 'inventory');
  
  const weightUnits = units.filter(u => u.type === 'weight');
  const volumeUnits = units.filter(u => u.type === 'volume');
  const countUnits = units.filter(u => u.type === 'count');
  const generalUnits = units.filter(u => u.type === 'general');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Recipe Categories</CardTitle>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : recipeCategories.length === 0 ? (
            <p className="text-muted-foreground">No recipe categories found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recipeCategories.map((category) => (
                <div key={category.id} className="flex items-center gap-1">
                  <Badge variant="secondary">{category.name}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCategory(category)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{category.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Inventory Categories</CardTitle>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : inventoryCategories.length === 0 ? (
            <p className="text-muted-foreground">No inventory categories found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inventoryCategories.map((category) => (
                <div key={category.id} className="flex items-center gap-1">
                  <Badge variant="outline">{category.name}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCategory(category)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{category.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Units Management</CardTitle>
          <Button onClick={() => setShowAddUnitDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weight Units */}
          <div>
            <h4 className="text-sm font-medium mb-2">Weight Units</h4>
            {weightUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weight units found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weightUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-1">
                    <Badge variant="secondary">
                      {unit.name} {unit.abbreviation && `(${unit.abbreviation})`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUnit(unit)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{unit.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUnit(unit.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Volume Units */}
          <div>
            <h4 className="text-sm font-medium mb-2">Volume Units</h4>
            {volumeUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No volume units found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {volumeUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-1">
                    <Badge variant="outline">
                      {unit.name} {unit.abbreviation && `(${unit.abbreviation})`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUnit(unit)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{unit.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUnit(unit.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Count Units */}
          <div>
            <h4 className="text-sm font-medium mb-2">Count Units</h4>
            {countUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No count units found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {countUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-1">
                    <Badge variant="destructive">
                      {unit.name} {unit.abbreviation && `(${unit.abbreviation})`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUnit(unit)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{unit.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUnit(unit.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Units */}
          <div>
            <h4 className="text-sm font-medium mb-2">General Units</h4>
            {generalUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No general units found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {generalUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-1">
                    <Badge>
                      {unit.name} {unit.abbreviation && `(${unit.abbreviation})`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUnit(unit)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{unit.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUnit(unit.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddCategoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchCategories();
          setShowAddDialog(false);
        }}
      />

      <AddUnitDialog
        open={showAddUnitDialog}
        onOpenChange={setShowAddUnitDialog}
        onSuccess={() => {
          fetchUnits();
          setShowAddUnitDialog(false);
        }}
      />

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={() => setEditingCategory(null)}
          onSuccess={() => {
            fetchCategories();
            setEditingCategory(null);
          }}
        />
      )}

      {editingUnit && (
        <EditUnitDialog
          unit={editingUnit}
          open={!!editingUnit}
          onOpenChange={() => setEditingUnit(null)}
          onSuccess={() => {
            fetchUnits();
            setEditingUnit(null);
          }}
        />
      )}
    </div>
  );
};