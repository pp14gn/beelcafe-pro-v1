import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Filter
} from "lucide-react";

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

  const inventoryData: InventoryItem[] = [
    {
      id: "1",
      name: "Coffee Beans - Arabica",
      category: "coffee",
      currentStock: 25,
      minStock: 10,
      unit: "lbs",
      costPerUnit: 12.50,
      supplier: "Premium Coffee Co.",
      lastRestocked: "2024-01-15"
    },
    {
      id: "2",
      name: "Milk - Whole",
      category: "dairy",
      currentStock: 8,
      minStock: 15,
      unit: "gallons",
      costPerUnit: 4.25,
      supplier: "Local Dairy Farm",
      lastRestocked: "2024-01-14"
    },
    {
      id: "3",
      name: "Sugar - White",
      category: "sweeteners",
      currentStock: 50,
      minStock: 20,
      unit: "lbs",
      costPerUnit: 2.30,
      supplier: "Bulk Supply Inc.",
      lastRestocked: "2024-01-10"
    },
    {
      id: "4",
      name: "Paper Cups - 12oz",
      category: "supplies",
      currentStock: 250,
      minStock: 500,
      unit: "units",
      costPerUnit: 0.15,
      supplier: "Restaurant Supply Co.",
      lastRestocked: "2024-01-12"
    },
    {
      id: "5",
      name: "Oat Milk",
      category: "dairy",
      currentStock: 12,
      minStock: 8,
      unit: "containers",
      costPerUnit: 3.75,
      supplier: "Plant Based Foods",
      lastRestocked: "2024-01-16"
    }
  ];

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
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const criticalItems = inventoryData.filter(item => getStockStatus(item.currentStock, item.minStock) === "critical");
  const lowStockItems = inventoryData.filter(item => getStockStatus(item.currentStock, item.minStock) === "low");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor stock levels and manage inventory</p>
        </div>
        <Button className="gap-2 bg-gradient-coffee hover:opacity-90">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            
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
        </div>
      </Card>

      {/* Inventory Table */}
      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Inventory Items</h3>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
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
              const status = getStockStatus(item.currentStock, item.minStock);
              
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell>
                    <span className={status === "critical" ? "text-destructive font-semibold" : ""}>
                      {item.currentStock} {item.unit}
                    </span>
                  </TableCell>
                  <TableCell>{item.minStock} {item.unit}</TableCell>
                  <TableCell>{getStatusBadge(status)}</TableCell>
                  <TableCell>${item.costPerUnit.toFixed(2)}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.lastRestocked}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Restock
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Inventory;