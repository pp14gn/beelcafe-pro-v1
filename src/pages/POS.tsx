import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Coffee, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  DollarSign,
  Settings
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  modifiers?: string[];
}

interface OrderItem extends MenuItem {
  quantity: number;
  selectedModifiers: string[];
}

const POS = () => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("coffee");

  const menuItems: MenuItem[] = [
    { id: "1", name: "Espresso", price: 2.50, category: "coffee" },
    { id: "2", name: "Americano", price: 3.00, category: "coffee" },
    { id: "3", name: "Latte", price: 4.50, category: "coffee", modifiers: ["Extra Shot", "Oat Milk", "Vanilla Syrup"] },
    { id: "4", name: "Cappuccino", price: 4.00, category: "coffee", modifiers: ["Extra Shot", "Decaf", "Extra Foam"] },
    { id: "5", name: "Croissant", price: 3.50, category: "pastries" },
    { id: "6", name: "Blueberry Muffin", price: 2.75, category: "pastries" },
    { id: "7", name: "Avocado Toast", price: 8.50, category: "food" },
    { id: "8", name: "Breakfast Sandwich", price: 7.25, category: "food" },
  ];

  const categories = [
    { id: "coffee", name: "Coffee", icon: Coffee },
    { id: "pastries", name: "Pastries", icon: Coffee },
    { id: "food", name: "Food", icon: Coffee },
  ];

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1, selectedModifiers: [] }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as OrderItem[]);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const filteredItems = menuItems.filter(item => item.category === selectedCategory);

  return (
    <div className="flex h-screen bg-background">
      {/* Menu Section */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Point of Sale</h1>
          <p className="text-muted-foreground">Select items to add to the current order</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="gap-2"
            >
              <category.icon className="h-4 w-4" />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="p-4 cursor-pointer hover:shadow-coffee transition-all duration-200 border-2 hover:border-coffee-gold/30"
              onClick={() => addToCart(item)}
            >
              <div className="text-center">
                <div className="h-20 w-20 mx-auto mb-3 rounded-full bg-gradient-cream flex items-center justify-center">
                  <Coffee className="h-8 w-8 text-coffee-bean" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
                <p className="text-lg font-bold text-coffee-gold">${item.price.toFixed(2)}</p>
                {item.modifiers && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Customizable
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-card border-l border-border shadow-elevated">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Current Order</h2>
        </div>

        <ScrollArea className="flex-1 p-4 h-[calc(100vh-200px)]">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in cart</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{item.name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-coffee-gold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 h-6 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Customize
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Checkout Section */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Total:</span>
              <span className="text-xl font-bold text-coffee-gold">
                ${getTotalPrice().toFixed(2)}
              </span>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Cash
              </Button>
              <Button className="gap-2 bg-gradient-coffee hover:opacity-90">
                <CreditCard className="h-4 w-4" />
                Card
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;