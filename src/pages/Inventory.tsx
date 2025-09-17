import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import EditInventoryDialog from "@/components/EditInventoryDialog";
import RestockDialog from "@/components/RestockDialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  Edit,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  lastRestocked: string;
}

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setInventoryData(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleRestock = (item: any) => {
    setSelectedItem(item);
    setRestockDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadInventory();
  };

  const categories = [
    { id: "all", name: "All Items" },
    { id: "coffee", name: "Coffee" },
    { id: "dairy", name: "Dairy" },
    { id: "sweeteners", name: "Sweeteners" },
    { id: "supplies", name: "Supplies" }
  ];

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum) return "critical";
    if (current <= minimum * 1.5) return "low";
    return "good";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
      case "low":
        return <Badge variant="secondary" className="gap-1 bg-pos-warning/20 text-pos-warning border-pos-warning/30"><TrendingDown className="h-3 w-3" />Low</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1 bg-pos-success/20 text-pos-success border-pos-success/30"><TrendingUp className="h-3 w-3" />Good</Badge>;
    }
  };

  const filteredItems = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const criticalItems = inventoryData.filter(item => getStockStatus(item.current_stock, item.min_stock) === "critical");
  const lowStockItems = inventoryData.filter(item => getStockStatus(item.current_stock, item.min_stock) === "low");

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="text-center">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor stock levels and manage inventory</p>
        </div>
        <Button 
          className="gap-2 bg-gradient-coffee hover:opacity-90 w-full sm:w-auto"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical Stock</p>
              <p className="text-2xl font-bold text-destructive">{criticalItems.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-pos-warning/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-pos-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-pos-warning">{lowStockItems.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-coffee-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-coffee-gold">{inventoryData.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            
            <div className="grid grid-cols-2 sm:flex gap-1">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="text-xs sm:text-sm"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Inventory Items</h3>
        </div>
        
        {/* Mobile view - cards */}
        <div className="block sm:hidden">
          <div className="p-4 space-y-4">
            {filteredItems.map((item) => {
              const status = getStockStatus(item.current_stock, item.min_stock);
              
              return (
                <Card key={item.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {item.photo_url && (
                          <img 
                            src={item.photo_url} 
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg border"
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                        </div>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current Stock:</span>
                        <p className={status === "critical" ? "text-destructive font-semibold" : ""}>
                          {item.current_stock} {item.unit}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min Stock:</span>
                        <p>{item.min_stock} {item.unit}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost/Unit:</span>
                        <p>${item.cost_per_unit?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Supplier:</span>
                        <p className="truncate">{item.supplier || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleRestock(item)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restock
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Desktop view - table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Last Restocked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const status = getStockStatus(item.current_stock, item.min_stock);
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.photo_url && (
                          <img 
                            src={item.photo_url} 
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg border"
                          />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell>
                      <span className={status === "critical" ? "text-destructive font-semibold" : ""}>
                        {item.current_stock} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>{item.min_stock} {item.unit}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>${item.cost_per_unit?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{item.supplier || 'N/A'}</TableCell>
                    <TableCell>{item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRestock(item)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Restock
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Inventory Dialog */}
      <AddInventoryDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleDialogSuccess}
      />

      {/* Edit Inventory Dialog */}
      <EditInventoryDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        item={selectedItem}
      />

      {/* Restock Dialog */}
      <RestockDialog
        isOpen={restockDialogOpen}
        onClose={() => setRestockDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        item={selectedItem}
      />
    </div>
  );
};

export default Inventory;