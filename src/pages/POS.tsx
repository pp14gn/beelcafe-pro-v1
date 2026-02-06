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
import InventoryWarningDialog from "@/components/InventoryWarningDialog";
import CardPaymentDialog from "@/components/CardPaymentDialog";
import PayWithPointsDialog from "@/components/PayWithPointsDialog";
import RealtimeClock from "@/components/RealtimeClock";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { receiptPrinter } from "@/utils/receiptPrinter";
import { useSettings } from "@/hooks/useSettings";
import CustomerSelectDialog from "@/components/CustomerSelectDialog";
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
  AlertCircle,
  Search,
  Coins,
  Tag
} from "lucide-react";


interface RecipeSize {
  id: string;
  name: string;
  price_adjustment: number;
  ingredient_multiplier: number;
  is_default: boolean;
}

interface Promotion {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  recipe_ids: string[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  has_sizes?: boolean;
  photo_url?: string | null;
  promotion?: Promotion;
  modifiers?: {
    id: string;
    inventory_item: {
      id: string;
      name: string;
      cost_per_unit: number;
      unit: string;
    };
    quantity: number;
  }[];
}

interface OrderItem extends MenuItem {
  quantity: number;
  selectedModifiers: {
    id: string;
    inventory_item: {
      id: string;
      name: string;
      cost_per_unit: number;
      unit: string;
    };
    quantity: number;
  }[];
  selectedSize?: RecipeSize;
  discountedPrice?: number;
}

const POS = () => {
  const isMobile = useIsMobile();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("coffee");
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [startShiftDialogOpen, setStartShiftDialogOpen] = useState(false);
  const [cardPaymentDialogOpen, setCardPaymentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [currentCashTotal, setCurrentCashTotal] = useState(0);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftSummary, setShiftSummary] = useState({ sales: 0, cashOuts: 0 });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string, icon: any}[]>([]);
  const [inventoryWarningOpen, setInventoryWarningOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<MenuItem | null>(null);
  const [pendingSale, setPendingSale] = useState<'cash' | 'card' | null>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [criticalStockItems, setCriticalStockItems] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [payWithPointsOpen, setPayWithPointsOpen] = useState(false);
  const [pointsDiscount, setPointsDiscount] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();

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
    loadActivePromotions();
  }, [user]);

  const loadActivePromotions = async () => {
    try {
      const now = new Date().toISOString();
      const { data: promotions, error } = await supabase
        .from('promotions')
        .select('id, name, discount_type, discount_value')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);

      if (error) throw error;

      // Get recipe associations for each promotion
      const promotionsWithRecipes = await Promise.all(
        (promotions || []).map(async (promo) => {
          const { data: recipeLinks } = await supabase
            .from('promotion_recipes')
            .select('recipe_id')
            .eq('promotion_id', promo.id);

          return {
            ...promo,
            recipe_ids: recipeLinks?.map(r => r.recipe_id) || [],
          };
        })
      );

      setActivePromotions(promotionsWithRecipes);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
  };

  const getPromotionForRecipe = (recipeId: string): Promotion | undefined => {
    // Find a promotion that applies to this recipe (or applies to all if no recipes specified)
    return activePromotions.find(promo => 
      promo.recipe_ids.length === 0 || promo.recipe_ids.includes(recipeId)
    );
  };

  const calculateDiscountedPrice = (basePrice: number, promotion?: Promotion): number => {
    if (!promotion) return basePrice;
    
    if (promotion.discount_type === 'percentage') {
      return basePrice * (1 - Number(promotion.discount_value) / 100);
    } else {
      return Math.max(0, basePrice - Number(promotion.discount_value));
    }
  };

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
          has_sizes,
          photo_url,
          recipe_modifiers (
            id,
            quantity,
            is_active,
            inventory_item:inventory_items (
              id,
              name,
              cost_per_unit,
              unit
            )
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
        has_sizes: recipe.has_sizes || false,
        photo_url: recipe.photo_url || null,
        modifiers: recipe.recipe_modifiers
          ?.filter(modifier => modifier.is_active && modifier.inventory_item)
          ?.map(modifier => ({
            id: modifier.id,
            inventory_item: {
              id: modifier.inventory_item.id,
              name: modifier.inventory_item.name,
              cost_per_unit: Number(modifier.inventory_item.cost_per_unit),
              unit: modifier.inventory_item.unit
            },
            quantity: Number(modifier.quantity)
          })) || []
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
    const subtotal = cart.reduce((total, item) => {
      const sizeAdjustment = item.selectedSize?.price_adjustment || 0;
      const itemPrice = item.discountedPrice !== undefined ? item.discountedPrice : item.price;
      const basePrice = (itemPrice + sizeAdjustment) * item.quantity;
      const modifierPrice = item.selectedModifiers.reduce((modTotal, modifier) => 
        modTotal + (modifier.inventory_item.cost_per_unit * modifier.quantity * item.quantity), 0
      );
      return total + basePrice + modifierPrice;
    }, 0);
    return Math.max(0, subtotal - pointsDiscount);
  };

  const getSubtotalBeforePoints = () => {
    return cart.reduce((total, item) => {
      const sizeAdjustment = item.selectedSize?.price_adjustment || 0;
      const itemPrice = item.discountedPrice !== undefined ? item.discountedPrice : item.price;
      const basePrice = (itemPrice + sizeAdjustment) * item.quantity;
      const modifierPrice = item.selectedModifiers.reduce((modTotal, modifier) => 
        modTotal + (modifier.inventory_item.cost_per_unit * modifier.quantity * item.quantity), 0
      );
      return total + basePrice + modifierPrice;
    }, 0);
  };

  const checkInventoryForItem = async (menuItem: MenuItem) => {
    try {
      const { data: recipeIngredients, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          quantity,
          inventory_items (
            id,
            name,
            current_stock,
            min_stock
          )
        `)
        .eq('recipe_id', menuItem.id);

      if (error) {
        console.error('Error checking inventory:', error);
        return { lowStock: [], critical: [] };
      }

      const lowStock: any[] = [];
      const critical: any[] = [];

      recipeIngredients?.forEach(ingredient => {
        const item = ingredient.inventory_items;
        if (item) {
          const neededQuantity = Number(ingredient.quantity);
          const currentStock = Number(item.current_stock);
          const minStock = Number(item.min_stock);

          if (currentStock <= 0) {
            critical.push({
              name: item.name,
              current_stock: currentStock,
              min_stock: minStock,
              status: 'critical'
            });
          } else if (currentStock <= minStock || currentStock - neededQuantity <= minStock) {
            lowStock.push({
              name: item.name,
              current_stock: currentStock,
              min_stock: minStock,
              status: 'low'
            });
          }
        }
      });

      return { lowStock, critical };
    } catch (error) {
      console.error('Error checking inventory:', error);
      return { lowStock: [], critical: [] };
    }
  };

  const addToCart = async (menuItem: MenuItem) => {
    const { lowStock, critical } = await checkInventoryForItem(menuItem);
    
    if (critical.length > 0 || lowStock.length > 0) {
      setLowStockItems(lowStock);
      setCriticalStockItems(critical);
      setPendingCartItem(menuItem);
      setInventoryWarningOpen(true);
      
      // Show toast notification for low stock items
      if (lowStock.length > 0 && critical.length === 0) {
        toast({
          variant: "default",
          title: "Low Stock Warning",
          description: `Some ingredients for ${menuItem.name} are running low.`,
        });
      }
      return;
    }

    addItemToCart(menuItem);
  };

  const addItemToCart = (menuItem: MenuItem) => {
    // Get promotion for this item
    const promotion = getPromotionForRecipe(menuItem.id);
    const discountedPrice = promotion ? calculateDiscountedPrice(menuItem.price, promotion) : undefined;

    // If item has sizes or modifiers, always open customize dialog
    if (menuItem.has_sizes || (menuItem.modifiers && menuItem.modifiers.length > 0)) {
      const orderItem: OrderItem = {
        ...menuItem,
        quantity: 1,
        selectedModifiers: [],
        selectedSize: undefined,
        promotion,
        discountedPrice,
      };
      setCart([...cart, orderItem]);
      setSelectedItem(orderItem);
      setCustomizeDialogOpen(true);
      return;
    }

    const existingItemIndex = cart.findIndex(item => 
      item.id === menuItem.id && item.selectedModifiers.length === 0 && !item.selectedSize
    );

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      const orderItem: OrderItem = {
        ...menuItem,
        quantity: 1,
        selectedModifiers: [],
        selectedSize: undefined,
        promotion,
        discountedPrice,
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

  const updateCartItemModifiers = (itemId: string, selectedModifiers: {
    id: string;
    inventory_item: {
      id: string;
      name: string;
      cost_per_unit: number;
      unit: string;
    };
    quantity: number;
  }[], selectedSize?: RecipeSize) => {
    const index = cart.findIndex(item => item === selectedItem);
    if (index >= 0) {
      const updatedCart = [...cart];
      updatedCart[index] = { ...updatedCart[index], selectedModifiers, selectedSize };
      setCart(updatedCart);
    }
  };

  const checkInventoryForCart = async () => {
    const allLowStock: any[] = [];
    const allCritical: any[] = [];

    for (const item of cart) {
      const { lowStock, critical } = await checkInventoryForItem(item);
      allLowStock.push(...lowStock);
      allCritical.push(...critical);
    }

    // Remove duplicates
    const uniqueLowStock = allLowStock.filter((item, index, self) => 
      index === self.findIndex(i => i.name === item.name)
    );
    const uniqueCritical = allCritical.filter((item, index, self) => 
      index === self.findIndex(i => i.name === item.name)
    );

    return { lowStock: uniqueLowStock, critical: uniqueCritical };
  };

  const processSale = async (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0 || !user) return;

    const { lowStock, critical } = await checkInventoryForCart();
    
    if (critical.length > 0) {
      setLowStockItems(lowStock);
      setCriticalStockItems(critical);
      setPendingSale(paymentMethod);
      setInventoryWarningOpen(true);
      return;
    }

    if (lowStock.length > 0) {
      toast({
        variant: "default",
        title: "Low Stock Warning",
        description: `${lowStock.length} ingredients are running low.`,
      });
    }

    executeProcessSale(paymentMethod);
  };

  const executeProcessSale = async (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0 || !user) return;

    try {
      const total = getTotalPrice();
      
      // Insert sale with customer_id if selected
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          shift_id: currentShift?.id || null,
          items: cart as any,
          total_amount: total,
          payment_method: paymentMethod,
          customer_id: selectedCustomer?.id || null,
        })
        .select('id')
        .single();

      if (saleError) {
        console.error('Sale recording error:', saleError);
        toast({
          variant: "destructive",
          title: "Sale Failed",
          description: "Failed to record the sale.",
        });
        return;
      }

      // Award loyalty points if customer is selected and loyalty is enabled
      if (selectedCustomer && settings.loyaltyEnabled) {
        try {
          // Fetch fresh customer data (selectedCustomer from dialog is a lightweight object)
          const { data: customerRow, error: customerFetchError } = await supabase
            .from('customers')
            .select('id, name, points, total_spent, visit_count, birthday, membership_tier')
            .eq('id', selectedCustomer.id)
            .single();

          if (customerFetchError || !customerRow) {
            console.error('Customer fetch error:', customerFetchError);
          } else {
            const currentTier = customerRow.membership_tier || (Number(customerRow.total_spent) >= 100 ? 'gold' : Number(customerRow.total_spent) >= 50 ? 'silver' : 'bronze');
            const tierMultiplier = currentTier === 'gold' ? 1.5 : currentTier === 'silver' ? 1.25 : 1;

            // Check for active loyalty events
            let eventMultiplier = 1;
            const nowIso = new Date().toISOString();
            const { data: activeEvents, error: eventsError } = await supabase
              .from('loyalty_events')
              .select('multiplier, event_type')
              .eq('is_active', true)
              .lte('start_date', nowIso)
              .gte('end_date', nowIso);

            if (eventsError) {
              console.error('Loyalty events load error:', eventsError);
            }

            const today = new Date();
            const customerBirthday = customerRow.birthday ? new Date(customerRow.birthday) : null;
            const isBirthday = !!customerBirthday &&
              customerBirthday.getMonth() === today.getMonth() &&
              customerBirthday.getDate() === today.getDate();

            (activeEvents || []).forEach((event) => {
              const multiplier = Number(event.multiplier) || 1;
              if (event.event_type === 'birthday') {
                if (isBirthday) eventMultiplier = Math.max(eventMultiplier, multiplier);
                return;
              }

              // Default behavior: multiplier/bonus apply during their active window
              if (event.event_type === 'multiplier' || event.event_type === 'bonus') {
                eventMultiplier = Math.max(eventMultiplier, multiplier);
              }
            });

            // Calculate points: base points × tier multiplier × event multiplier
            const basePoints = Math.floor(total * settings.loyaltyPointsPerDollar);
            const earnedPoints = Math.floor(basePoints * tierMultiplier * eventMultiplier);

            // Update customer points, total_spent, and visit_count
            const newTotalSpent = Number(customerRow.total_spent) + total;
            const newTier = newTotalSpent >= 100 ? 'gold' : newTotalSpent >= 50 ? 'silver' : 'bronze';

            const { error: customerError } = await supabase
              .from('customers')
              .update({
                points: Number(customerRow.points) + earnedPoints,
                total_spent: newTotalSpent,
                visit_count: Number(customerRow.visit_count) + 1,
                membership_tier: newTier,
              })
              .eq('id', customerRow.id);

            if (customerError) {
              console.error('Customer update error:', customerError);
            } else {
              // Record transaction history
              await supabase
                .from('customer_transactions')
                .insert({
                  customer_id: customerRow.id,
                  type: 'earn',
                  points: earnedPoints,
                  sale_id: saleData.id,
                  description: `Earned ${earnedPoints} pts from $${total.toFixed(2)} purchase`,
                });

              const multiplierNote = tierMultiplier > 1 || eventMultiplier > 1
                ? ` (${tierMultiplier > 1 ? `${currentTier} ${tierMultiplier}x` : ''}${eventMultiplier > 1 ? ` Event ${eventMultiplier}x` : ''})`
                : '';

              toast({
                title: "Points Earned!",
                description: `${customerRow.name} earned ${earnedPoints} points${multiplierNote}`,
              });
            }
          }
        } catch (loyaltyError) {
          console.error('Loyalty points error:', loyaltyError);
        }
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
          customer_name: customerName.trim() || selectedCustomer?.name || null,
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
        }
      } catch (inventoryError) {
        console.error('Inventory update error:', inventoryError);
      }

      // Print receipt if enabled
      if (settings.autoPrintReceipts) {
        try {
          const receiptData = {
            storeName: settings.storeName,
            storeAddress: settings.storeAddress,
            storePhone: settings.storePhone,
            items: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              selectedModifiers: item.selectedModifiers
            })),
            total,
            paymentMethod,
            customerName: customerName.trim() || selectedCustomer?.name || undefined,
            cashier: user?.email || 'Unknown',
            timestamp: new Date(),
            receiptNumber: receiptPrinter.generateReceiptNumber()
          };
          
          const printed = await receiptPrinter.printReceipt(receiptData);
          if (!printed) {
            toast({
              variant: "default",
              title: "Print Warning",
              description: "Receipt could not be printed automatically.",
            });
          }
        } catch (error) {
          console.error('Receipt printing error:', error);
        }
      }

      toast({
        title: "Sale Completed",
        description: `${paymentMethod === 'cash' ? 'Cash' : 'Card'} payment of $${total.toFixed(2)} processed successfully.`,
      });

      setCart([]);
      setCustomerName("");
      setSelectedCustomer(null);
      setPointsDiscount(0);
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

  const handleInventoryConfirm = () => {
    if (pendingCartItem) {
      addItemToCart(pendingCartItem);
      setPendingCartItem(null);
    }
    
    if (pendingSale) {
      executeProcessSale(pendingSale);
      setPendingSale(null);
    }
    
    setInventoryWarningOpen(false);
    setLowStockItems([]);
    setCriticalStockItems([]);
  };

  const handleInventoryCancel = () => {
    setPendingCartItem(null);
    setPendingSale(null);
    setInventoryWarningOpen(false);
    setLowStockItems([]);
    setCriticalStockItems([]);
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

      // Print shift close receipt
      try {
        const receiptData = {
          storeName: settings?.storeName || 'Coffee Shop',
          storeAddress: settings?.storeAddress || '',
          storePhone: settings?.storePhone || '',
          cashier: user?.email || 'Unknown',
          timestamp: new Date(),
          receiptNumber: receiptPrinter.generateReceiptNumber(),
          salesTotal: shiftSummary.sales,
          cashOutsTotal: shiftSummary.cashOuts,
          netCashTotal: shiftSummary.sales - shiftSummary.cashOuts
        };
        
        const printed = await receiptPrinter.printShiftCloseReceipt(receiptData);
        if (!printed) {
          toast({
            variant: "default",
            title: "Print Warning",
            description: "Shift close receipt could not be printed.",
          });
        }
      } catch (error) {
        console.error('Shift close receipt printing error:', error);
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
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Real-time Clock */}
              <RealtimeClock 
                currentShift={currentShift} 
                onShiftAutoClose={() => {
                  setCurrentShift(null);
                  loadCurrentShift();
                  loadCurrentCashTotal();
                }}
              />
              <div className="text-center lg:text-right">
                <p className="text-sm text-muted-foreground">Today's Cash</p>
                <p className="text-lg font-bold text-coffee-gold">${currentCashTotal.toFixed(2)}</p>
              </div>
              {!currentShift && (
                <Button
                  onClick={() => setStartShiftDialogOpen(true)}
                  className="gap-2 bg-gradient-coffee hover:opacity-90 w-full lg:w-auto"
                >
                  <Clock className="h-4 w-4" />
                  Start Shift
                </Button>
              )}
              {currentShift && (
                <div className="flex gap-2 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setCashOutDialogOpen(true)}
                    className="gap-2 border-coffee-gold/30 hover:bg-coffee-gold/10 flex-1 lg:flex-none"
                    disabled={currentCashTotal <= 0}
                  >
                    <Calculator className="h-4 w-4" />
                    <span className="hidden lg:inline">Cash Out</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEndShift}
                    className="gap-2 border-destructive/30 hover:bg-destructive/10 flex-1 lg:flex-none"
                  >
                    <StopCircle className="h-4 w-4" />
                    <span className="hidden lg:inline">End Shift</span>
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
                  {filteredItems.map((item) => {
                    const promotion = getPromotionForRecipe(item.id);
                    const discountedPrice = promotion ? calculateDiscountedPrice(item.price, promotion) : null;
                    
                    return (
                      <Card
                        key={item.id}
                        className={`p-3 lg:p-4 transition-all duration-200 border-2 relative ${
                          currentShift 
                            ? "cursor-pointer hover:shadow-coffee hover:border-coffee-gold/30" 
                            : "opacity-50 cursor-not-allowed"
                        } ${promotion ? "border-primary/30" : ""}`}
                        onClick={() => currentShift && addToCart(item)}
                      >
                        {promotion && (
                          <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {promotion.discount_type === 'percentage' 
                              ? `${promotion.discount_value}% OFF`
                              : `$${Number(promotion.discount_value).toFixed(0)} OFF`
                            }
                          </Badge>
                        )}
                        <div className="text-center">
                          <div className="h-16 w-16 lg:h-20 lg:w-20 mx-auto mb-2 lg:mb-3 rounded-full bg-gradient-cream flex items-center justify-center overflow-hidden">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <Coffee className="h-6 w-6 lg:h-8 lg:w-8 text-coffee-bean" />
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground mb-1 text-sm lg:text-base">{item.name}</h3>
                          {discountedPrice !== null ? (
                            <div>
                              <p className="text-xs text-muted-foreground line-through">${item.price.toFixed(2)}</p>
                              <p className="text-base lg:text-lg font-bold text-primary">${discountedPrice.toFixed(2)}</p>
                            </div>
                          ) : (
                            <p className="text-base lg:text-lg font-bold text-coffee-gold">${item.price.toFixed(2)}</p>
                          )}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <Badge variant="secondary" className="mt-1 lg:mt-2 text-xs">
                              Customizable
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
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
                                    <Badge key={modifier.id} variant="outline" className="mr-1 text-xs">
                                      {modifier.inventory_item.name} x{modifier.quantity} (+${(modifier.inventory_item.cost_per_unit * modifier.quantity).toFixed(2)})
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
                              ${((item.price + item.selectedModifiers.reduce((sum, mod) => sum + (mod.inventory_item.cost_per_unit * mod.quantity), 0)) * item.quantity).toFixed(2)}
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
                    <div className="space-y-2">
                      {selectedCustomer ? (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">{selectedCustomer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {Number(selectedCustomer.points).toFixed(0)} points
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCustomer(null)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {settings.loyaltyEnabled && (
                            <p className="text-xs text-primary">
                              Will earn {Math.floor(getTotalPrice() * settings.loyaltyPointsPerDollar)} points
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setCustomerSelectDialogOpen(true)}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Select Customer
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="customerName" className="text-sm font-medium text-foreground">
                        Customer Name (Optional)
                      </label>
                      <Input
                        id="customerName"
                        placeholder="Enter customer name..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* Points Discount Display */}
                    {pointsDiscount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Points Discount:</span>
                        <span className="text-primary font-medium">-${pointsDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total:</span>
                      <span className="text-xl font-bold text-coffee-gold">
                        ${getTotalPrice().toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Pay with Points Button */}
                    {selectedCustomer && settings.loyaltyEnabled && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => setPayWithPointsOpen(true)}
                        disabled={cart.length === 0 || !currentShift}
                      >
                        <Coins className="h-4 w-4" />
                        Pay with Points ({Number(selectedCustomer.points).toLocaleString()} available)
                      </Button>
                    )}
                    
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
                        onClick={() => {
                          if (cart.length === 0 || !currentShift) return;
                          setCardPaymentDialogOpen(true);
                        }}
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
          <div className="space-y-3">
            {selectedCustomer ? (
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(selectedCustomer.points).toFixed(0)} pts
                      {settings.loyaltyEnabled && ` (+${Math.floor(getTotalPrice() * settings.loyaltyPointsPerDollar)})`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCustomerSelectDialogOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Select Customer
              </Button>
            )}
            
            <div className="space-y-2">
              <label htmlFor="customerNameMobile" className="text-sm font-medium text-foreground">
                Customer Name (Optional)
              </label>
              <Input
                id="customerNameMobile"
                placeholder="Enter customer name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div className="flex justify-between items-center">
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
                onClick={() => {
                  if (cart.length === 0 || !currentShift) return;
                  setCardPaymentDialogOpen(true);
                }}
                disabled={cart.length === 0 || !currentShift}
              >
                <CreditCard className="h-4 w-4" />
                Card
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Card Payment Dialog */}
      <CardPaymentDialog
        isOpen={cardPaymentDialogOpen}
        onClose={() => setCardPaymentDialogOpen(false)}
        onSuccess={(paymentId: string) => {
          console.log('Card payment successful:', paymentId);
          
          // Print receipt if enabled
          if (settings.autoPrintReceipts) {
            receiptPrinter.printReceipt({
              storeName: settings.storeName,
              storeAddress: settings.storeAddress,
              storePhone: settings.storePhone,
              items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price + item.selectedModifiers.reduce((sum, mod) => sum + (mod.inventory_item.cost_per_unit * mod.quantity), 0),
                selectedModifiers: item.selectedModifiers,
              })),
              total: getTotalPrice(),
              paymentMethod: 'card',
              customerName: customerName || undefined,
              cashier: user?.email || 'Unknown',
              timestamp: new Date(),
              receiptNumber: receiptPrinter.generateReceiptNumber(),
            });
          }

          // Clear cart and reset
          setCart([]);
          setCustomerName("");
          setSelectedCustomer(null);
          
          // Refresh current totals
          loadCurrentShift();
          
          toast({
            title: "Sale Completed",
            description: `Card payment of $${getTotalPrice().toFixed(2)} processed successfully.`,
          });
        }}
        total={getTotalPrice()}
        items={cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price + item.selectedModifiers.reduce((sum, mod) => sum + (mod.inventory_item.cost_per_unit * mod.quantity), 0),
          modifiers: item.selectedModifiers,
        }))}
        customerName={customerName}
        customerId={selectedCustomer?.id}
        userId={user?.id || ''}
        shiftId={currentShift?.id}
      />

      {/* Existing Dialogs */}
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

      {/* Inventory Warning Dialog */}
      <InventoryWarningDialog
        isOpen={inventoryWarningOpen}
        onClose={handleInventoryCancel}
        onConfirm={handleInventoryConfirm}
        lowStockItems={lowStockItems}
        criticalStockItems={criticalStockItems}
      />

      {/* Customer Select Dialog */}
      <CustomerSelectDialog
        isOpen={customerSelectDialogOpen}
        onClose={() => setCustomerSelectDialogOpen(false)}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setPointsDiscount(0); // Reset points discount when changing customer
          setCustomerSelectDialogOpen(false);
        }}
      />

      {/* Pay with Points Dialog */}
      {selectedCustomer && (
        <PayWithPointsDialog
          isOpen={payWithPointsOpen}
          onClose={() => setPayWithPointsOpen(false)}
          onSuccess={(pointsUsed, remainingAmount) => {
            setPointsDiscount(pointsUsed / 10); // 10 points = $1
            setPayWithPointsOpen(false);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          totalAmount={getSubtotalBeforePoints()}
        />
      )}
    </div>
  );
};

export default POS;