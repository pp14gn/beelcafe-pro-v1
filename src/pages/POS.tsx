import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useIsMobile } from "@/hooks/use-mobile";
import ModifierDialog from "@/components/ModifierDialog";
import CashOutDialog from "@/components/CashOutDialog";
import StartShiftDialog from "@/components/StartShiftDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Coffee, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  DollarSign,
  Settings,
  Calculator,
  Clock,
  StopCircle,
  AlertCircle
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
  const isMobile = useIsMobile();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("coffee");
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [startShiftDialogOpen, setStartShiftDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [currentCashTotal, setCurrentCashTotal] = useState(0);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftSummary, setShiftSummary] = useState({ sales: 0, cashOuts: 0 });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string, icon: any}[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  const categoryIcons = {
    coffee: Coffee,
    food: Coffee, // You can import different icons for different categories
    beverages: Coffee,
    // Add more category mappings as needed
  };

  const filteredItems = menuItems.filter(item => item.category === selectedCategory);

  useEffect(() => {
    loadCurrentShift();
    loadCurrentCashTotal();
    loadMenuItems();
  }, [user]);

  const loadMenuItems = async () => {
    try {
      setIsLoadingMenu(true);
      
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          base_price,
          category,
          is_active,
          recipe_modifiers (
            id,
            name,
            price,
            is_active
          )
        `)
        .eq('is_active', true);

      if (recipesError) {
        console.error('Error loading recipes:', recipesError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load menu items.",
        });
        return;
      }

      const formattedMenuItems: MenuItem[] = recipes?.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        price: Number(recipe.base_price),
        category: recipe.category,
        modifiers: recipe.recipe_modifiers
          ?.filter(modifier => modifier.is_active)
          ?.map(modifier => modifier.name) || []
      })) || [];

      setMenuItems(formattedMenuItems);

      // Get unique categories from recipes
      const uniqueCategories = [...new Set(formattedMenuItems.map(item => item.category))];
      const formattedCategories = uniqueCategories.map(category => ({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        icon: categoryIcons[category as keyof typeof categoryIcons] || Coffee
      }));
      
      setAvailableCategories(formattedCategories);
      
      // Set the first category as selected if none is selected or if selected category doesn't exist
      if (!selectedCategory || !uniqueCategories.includes(selectedCategory)) {
        setSelectedCategory(uniqueCategories[0] || 'coffee');
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load menu items.",
      });
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const loadCurrentShift = async () => {
    if (!user) return;

    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading current shift:', error);
        return;
      }

      setCurrentShift(shift);
      
      if (shift) {
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('shift_id', shift.id);

        const { data: cashOuts, error: cashOutsError } = await supabase
          .from('cash_outs')
          .select('amount')
          .eq('shift_id', shift.id);

        if (!salesError && !cashOutsError) {
          const totalSales = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
          const totalCashOuts = cashOuts?.reduce((sum, cashOut) => sum + cashOut.amount, 0) || 0;
          
          setShiftSummary({ sales: totalSales, cashOuts: totalCashOuts });
        }
      }
    } catch (error) {
      console.error('Error loading current shift:', error);
    }
  };

  const loadCurrentCashTotal = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: sales, error } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('user_id', user.id)
        .eq('payment_method', 'cash')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) {
        console.error('Error loading cash total:', error);
        return;
      }

      const { data: cashOuts, error: cashOutError } = await supabase
        .from('cash_outs')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (cashOutError) {
        console.error('Error loading cash outs:', cashOutError);
        return;
      }

      const totalSales = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalCashOuts = cashOuts?.reduce((sum, cashOut) => sum + cashOut.amount, 0) || 0;
      
      setCurrentCashTotal(Math.max(0, totalSales - totalCashOuts));
    } catch (error) {
      console.error('Error loading current cash total:', error);
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const addToCart = (menuItem: MenuItem) => {
    const existingItemIndex = cart.findIndex(item => 
      item.id === menuItem.id && item.selectedModifiers.length === 0
    );

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      const orderItem: OrderItem = {
        ...menuItem,
        quantity: 1,
        selectedModifiers: []
      };
      setCart([...cart, orderItem]);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    setCart(updatedCart);
  };

  const openCustomizeDialog = (item: OrderItem) => {
    setSelectedItem(item);
    setCustomizeDialogOpen(true);
  };

  const updateCartItemModifiers = (itemId: string, selectedModifiers: string[]) => {
    const index = cart.findIndex(item => item === selectedItem);
    if (index >= 0) {
      const updatedCart = [...cart];
      updatedCart[index] = { ...updatedCart[index], selectedModifiers };
      setCart(updatedCart);
    }
  };

  const processSale = async (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0 || !user) return;

    try {
      const total = getTotalPrice();
      
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          shift_id: currentShift?.id || null,
          items: cart as any,
          total_amount: total,
          payment_method: paymentMethod,
        });

      if (saleError) {
        console.error('Sale recording error:', saleError);
        toast({
          variant: "destructive",
          title: "Sale Failed",
          description: "Failed to record the sale.",
        });
        return;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          shift_id: currentShift?.id || null,
          items: cart as any,
          total_amount: total,
          status: 'pending',
          start_time: new Date().toISOString(),
        });

      if (orderError) {
        console.error('Order creation error:', orderError);
      }

      // Update inventory based on recipe ingredients
      try {
        const { error: inventoryError } = await supabase.functions.invoke('process-sale-inventory', {
          body: { items: cart }
        });

        if (inventoryError) {
          console.error('Inventory update error:', inventoryError);
          // Don't fail the sale if inventory update fails, just log it
        }
      } catch (inventoryError) {
        console.error('Inventory update error:', inventoryError);
      }

      toast({
        title: "Sale Completed",
        description: `${paymentMethod === 'cash' ? 'Cash' : 'Card'} payment of $${total.toFixed(2)} processed successfully.`,
      });

      setCart([]);
      if (paymentMethod === 'cash') {
        setCurrentCashTotal(prev => prev + total);
      }
      
      if (currentShift) {
        loadCurrentShift();
      }
    } catch (error) {
      console.error('Unexpected error processing sale:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    }
  };

  const handleStartShift = (shiftId: string) => {
    loadCurrentShift();
    toast({
      title: "Shift Started",
      description: "Your shift has been started successfully.",
    });
  };

  const handleEndShift = async () => {
    if (!currentShift || !user) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          sales_total: shiftSummary.sales,
          cash_outs_total: shiftSummary.cashOuts
        })
        .eq('id', currentShift.id);

      if (error) {
        console.error('Error ending shift:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to end shift.",
        });
        return;
      }

      setCurrentShift(null);
      setShiftSummary({ sales: 0, cashOuts: 0 });
      toast({
        title: "Shift Ended",
        description: "Your shift has been ended successfully.",
      });
    } catch (error) {
      console.error('Unexpected error ending shift:', error);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex-1">
        <div className={`border-b border-border p-4 ${isMobile ? 'pb-20' : ''}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Point of Sale</h1>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-center sm:text-right">
                <p className="text-sm text-muted-foreground">Today's Cash</p>
                <p className="text-lg font-bold text-coffee-gold">${currentCashTotal.toFixed(2)}</p>
              </div>
              {!currentShift && (
                <Button
                  onClick={() => setStartShiftDialogOpen(true)}
                  className="gap-2 bg-gradient-coffee hover:opacity-90 w-full sm:w-auto"
                >
                  <Clock className="h-4 w-4" />
                  Start Shift
                </Button>
              )}
              {currentShift && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setCashOutDialogOpen(true)}
                    className="gap-2 border-coffee-gold/30 hover:bg-coffee-gold/10 flex-1 sm:flex-none"
                    disabled={currentCashTotal <= 0}
                  >
                    <Calculator className="h-4 w-4" />
                    <span className="hidden sm:inline">Cash Out</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEndShift}
                    className="gap-2 border-destructive/30 hover:bg-destructive/10 flex-1 sm:flex-none"
                  >
                    <StopCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">End Shift</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main POS Content */}
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)]">
            {/* Menu Section */}
            <div className="flex-1 p-4 lg:p-6">
              <p className="text-muted-foreground mb-4 lg:mb-6 text-sm lg:text-base">
                {currentShift ? 'Select items to add to the current order' : 'Start a shift to begin taking orders'}
              </p>

              {/* Category Tabs */}
              <div className="flex gap-2 mb-4 lg:mb-6 overflow-x-auto pb-2">
                {availableCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category.id)}
                    className="gap-2 shrink-0"
                  >
                    <category.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{category.name}</span>
                  </Button>
                ))}
              </div>

              {/* Menu Items Grid */}
              {isLoadingMenu ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {[...Array(8)].map((_, index) => (
                    <Card key={index} className="p-3 lg:p-4 animate-pulse">
                      <div className="text-center">
                        <div className="h-16 w-16 lg:h-20 lg:w-20 mx-auto mb-2 lg:mb-3 rounded-full bg-muted" />
                        <div className="h-4 bg-muted rounded mb-1" />
                        <div className="h-5 bg-muted rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items available in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {filteredItems.map((item) => (
                    <Card
                      key={item.id}
                      className={`p-3 lg:p-4 transition-all duration-200 border-2 ${
                        currentShift 
                          ? "cursor-pointer hover:shadow-coffee hover:border-coffee-gold/30" 
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => currentShift && addToCart(item)}
                    >
                      <div className="text-center">
                        <div className="h-16 w-16 lg:h-20 lg:w-20 mx-auto mb-2 lg:mb-3 rounded-full bg-gradient-cream flex items-center justify-center">
                          <Coffee className="h-6 w-6 lg:h-8 lg:w-8 text-coffee-bean" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1 text-sm lg:text-base">{item.name}</h3>
                        <p className="text-base lg:text-lg font-bold text-coffee-gold">${item.price.toFixed(2)}</p>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <Badge variant="secondary" className="mt-1 lg:mt-2 text-xs">
                            Customizable
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Cart Sidebar */}
            {!isMobile && (
              <div className="w-96 bg-card border-l border-border shadow-elevated">
                <div className="p-6 border-b border-border">
                  <h2 className="text-xl font-bold text-foreground">Current Order</h2>
                </div>

                <ScrollArea className="flex-1 p-4 h-[calc(100vh-280px)]">
                  {cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No items in cart</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item, index) => (
                        <Card key={`${item.id}-${index}`} className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{item.name}</h4>
                              <p className="text-sm text-coffee-gold">${item.price.toFixed(2)} each</p>
                              {item.selectedModifiers.length > 0 && (
                                <div className="mt-1">
                                  {item.selectedModifiers.map((modifier) => (
                                    <Badge key={modifier} variant="outline" className="mr-1 text-xs">
                                      {modifier}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-medium px-2">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-bold text-coffee-gold">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          
                          {item.modifiers && item.modifiers.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 h-6 text-xs"
                              onClick={() => openCustomizeDialog(item)}
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
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => processSale('cash')}
                        disabled={cart.length === 0 || !currentShift}
                      >
                        <DollarSign className="h-4 w-4" />
                        Cash
                      </Button>
                      <Button 
                        className="gap-2 bg-gradient-coffee hover:opacity-90"
                        onClick={() => processSale('card')}
                        disabled={cart.length === 0 || !currentShift}
                      >
                        <CreditCard className="h-4 w-4" />
                        Card
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Mobile Bottom Cart */}
      {isMobile && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-foreground">Cart ({cart.length})</span>
            <span className="text-lg font-bold text-coffee-gold">
              ${getTotalPrice().toFixed(2)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => processSale('cash')}
              disabled={cart.length === 0 || !currentShift}
            >
              <DollarSign className="h-4 w-4" />
              Cash
            </Button>
            <Button 
              className="gap-2 bg-gradient-coffee hover:opacity-90"
              onClick={() => processSale('card')}
              disabled={cart.length === 0 || !currentShift}
            >
              <CreditCard className="h-4 w-4" />
              Card
            </Button>
          </div>
        </div>
      )}

      {/* Modifier Dialog */}
      {selectedItem && (
        <ModifierDialog
          isOpen={customizeDialogOpen}
          onClose={() => setCustomizeDialogOpen(false)}
          item={selectedItem}
          onConfirm={updateCartItemModifiers}
        />
      )}

      {/* Start Shift Dialog */}
      <StartShiftDialog
        isOpen={startShiftDialogOpen}
        onClose={() => setStartShiftDialogOpen(false)}
        onShiftStarted={handleStartShift}
      />

      {/* Cash Out Dialog */}
      <CashOutDialog
        isOpen={cashOutDialogOpen}
        onClose={() => setCashOutDialogOpen(false)}
        currentCashTotal={currentCashTotal}
      />
    </div>
  );
};

export default POS;