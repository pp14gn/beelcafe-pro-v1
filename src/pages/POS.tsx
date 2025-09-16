import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import OrderTracker from "@/components/OrderTracker";

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
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [startShiftDialogOpen, setStartShiftDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [currentCashTotal, setCurrentCashTotal] = useState(0);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftSummary, setShiftSummary] = useState({ sales: 0, cashOuts: 0 });
  const [tablesExist, setTablesExist] = useState<boolean>(true);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

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

  const updateCartItemModifiers = (itemId: string, selectedModifiers: string[]) => {
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, selectedModifiers }
        : item
    ));
  };

  const openCustomizeDialog = (item: OrderItem) => {
    setSelectedItem(item);
    setCustomizeDialogOpen(true);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const modifierCost = item.selectedModifiers.length * 0.50; // $0.50 per modifier
      return total + ((item.price + modifierCost) * item.quantity);
    }, 0);
  };

  const filteredItems = menuItems.filter(item => item.category === selectedCategory);

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      
      // Load current shift and cash total
      loadCurrentShift();
      loadCurrentCashTotal();
    };
    
    initializeData();
  }, [user]);

  const loadCurrentShift = async () => {
    if (!user) return;

    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error loading current shift:', error);
        return;
      }

      setCurrentShift(shift);
      
      if (shift) {
        // Load shift summary
        const today = new Date().toISOString().split('T')[0];
        
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
      
      // Get today's cash sales for this user
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

      // Get today's cash outs for this user
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

  const processSale = async (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0 || !user) return;

    try {
      const total = getTotalPrice();
      
      // Record the sale
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

      // Create order for tracking
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

      toast({
        title: "Sale Completed",
        description: `${paymentMethod === 'cash' ? 'Cash' : 'Card'} payment of $${total.toFixed(2)} processed successfully.`,
      });

      // Clear cart and update cash total if cash payment
      setCart([]);
      if (paymentMethod === 'cash') {
        setCurrentCashTotal(prev => prev + total);
      }
      
      // Reload shift summary
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
          end_time: new Date().toISOString(),
          ending_cash: currentCashTotal,
          sales_total: shiftSummary.sales,
          cash_outs_total: shiftSummary.cashOuts,
          status: 'completed',
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      toast({
        title: "Shift Ended",
        description: `Shift ended with $${currentCashTotal.toFixed(2)} in cash.`,
      });

      setCurrentShift(null);
      setShiftSummary({ sales: 0, cashOuts: 0 });
      setCurrentCashTotal(0);
    } catch (error) {
      console.error('Error ending shift:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to end shift. Please try again.",
      });
    }
  };

  // Show normal POS interface
  return (
    <div className="flex h-screen bg-background">
      {/* Main Content with Tabs */}
      <div className="flex-1">
        <Tabs defaultValue="pos" className="h-full">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Today's Cash</p>
                  <p className="text-lg font-bold text-coffee-gold">${currentCashTotal.toFixed(2)}</p>
                </div>
                {!currentShift && (
                  <Button
                    onClick={() => setStartShiftDialogOpen(true)}
                    className="gap-2 bg-gradient-coffee hover:opacity-90"
                  >
                    <Clock className="h-4 w-4" />
                    Start Shift
                  </Button>
                )}
                {currentShift && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCashOutDialogOpen(true)}
                      className="gap-2 border-coffee-gold/30 hover:bg-coffee-gold/10"
                      disabled={currentCashTotal <= 0}
                    >
                      <Calculator className="h-4 w-4" />
                      Cash Out
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleEndShift}
                      className="gap-2 border-destructive/30 hover:bg-destructive/10"
                    >
                      <StopCircle className="h-4 w-4" />
                      End Shift
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="pos">POS System</TabsTrigger>
              <TabsTrigger value="orders">Open Orders</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pos" className="flex h-[calc(100vh-140px)] m-0">
            {/* Menu Section */}
            <div className="flex-1 p-6">
              <p className="text-muted-foreground mb-6">
                {currentShift ? 'Select items to add to the current order' : 'Start a shift to begin taking orders'}
              </p>

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
                    className={`p-4 transition-all duration-200 border-2 ${
                      currentShift 
                        ? "cursor-pointer hover:shadow-coffee hover:border-coffee-gold/30" 
                        : "opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() => currentShift && addToCart(item)}
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

              <ScrollArea className="flex-1 p-4 h-[calc(100vh-280px)]">
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
                            ${((item.price + (item.selectedModifiers.length * 0.50)) * item.quantity).toFixed(2)}
                          </p>
                        </div>

                        {item.selectedModifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.selectedModifiers.map((modifier) => (
                              <Badge key={modifier} variant="secondary" className="text-xs">
                                {modifier}
                              </Badge>
                            ))}
                          </div>
                        )}

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
          </TabsContent>

          <TabsContent value="orders" className="h-[calc(100vh-140px)] m-0">
            {currentShift ? (
              <OrderTracker currentShift={currentShift} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a shift to view orders</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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