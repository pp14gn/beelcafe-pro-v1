import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RefundOrderDialog from "@/components/RefundOrderDialog";
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  Play,
  Coffee,
  Timer,
  RotateCcw
} from "lucide-react";

interface Order {
  id: string;
  items: any[];
  total_amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  start_time: string;
  completion_time: string | null;
  prep_time_seconds: number | null;
  created_at: string;
  customer_name: string | null;
}

interface OrderTrackerProps {
  currentShift: any;
}

const OrderTracker = ({ currentShift }: OrderTrackerProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [timers, setTimers] = useState<{ [key: string]: number }>({});
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentShift) {
      loadOrders();
      const interval = setInterval(updateTimers, 1000);
      return () => clearInterval(interval);
    }
  }, [currentShift]);

  const loadOrders = async () => {
    if (!currentShift) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, prep_time_seconds, customer_name')
        .eq('shift_id', currentShift.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allOrders = (data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : [],
        prep_time_seconds: order.prep_time_seconds || 0
      }));
      setOrders(allOrders as any[]);
      setActiveOrders(allOrders.filter(order => ['pending', 'in_progress'].includes(order.status as string)) as any[]);
      setCompletedOrders(allOrders.filter(order => ['completed', 'cancelled'].includes(order.status as string)) as any[]);

      // Initialize timers for active orders
      const newTimers: { [key: string]: number } = {};
      allOrders.forEach(order => {
        if (['pending', 'in_progress'].includes(order.status)) {
          const startTime = new Date(order.start_time).getTime();
          const now = Date.now();
          newTimers[order.id] = Math.floor((now - startTime) / 1000);
        }
      });
      setTimers(newTimers);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const updateTimers = () => {
    setTimers(prev => {
      const updated = { ...prev };
      activeOrders.forEach(order => {
        if (['pending', 'in_progress'].includes(order.status)) {
          const startTime = new Date(order.start_time).getTime();
          const now = Date.now();
          updated[order.id] = Math.floor((now - startTime) / 1000);
        }
      });
      return updated;
    });
  };

  const updateOrderStatus = async (orderId: string, status: 'in_progress' | 'completed') => {
    try {
      const updateData: any = { status };
      
      if (status === 'completed') {
        const completionTime = new Date().toISOString();
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const startTime = new Date(order.start_time).getTime();
          const endTime = new Date(completionTime).getTime();
          const prepTimeSeconds = Math.floor((endTime - startTime) / 1000);
          
          updateData.completion_time = completionTime;
          updateData.prep_time_seconds = prepTimeSeconds;
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: status === 'completed' ? "Order Completed" : "Order Started",
        description: `Order has been ${status === 'completed' ? 'completed' : 'started'}.`,
      });

      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Circle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Play className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600"><RotateCcw className="h-3 w-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRefundOrder = (order: Order) => {
    setSelectedOrder(order);
    setRefundDialogOpen(true);
  };

  const handleRefundComplete = () => {
    loadOrders();
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-coffee-bean" />
          <div className="flex flex-col">
            <span className="font-medium">Order #{order.id.slice(-6)}</span>
            {order.customer_name && (
              <span className="text-sm text-muted-foreground">{order.customer_name}</span>
            )}
          </div>
          {getStatusBadge(order.status)}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-3 w-3" />
          {order.status === 'completed' && order.prep_time_seconds ? (
            <span>{formatTime(order.prep_time_seconds)} total</span>
          ) : (
            <span className="font-mono">{formatTime(timers[order.id] || 0)}</span>
          )}
        </div>
      </div>
      
      <div className="space-y-2 mb-3">
        {order.items.map((item: any, index: number) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.name}</span>
            <span className="text-muted-foreground">
              ${((item.price + (item.selectedModifiers?.length || 0) * 0.50) * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="font-semibold text-coffee-gold">
          Total: ${order.total_amount.toFixed(2)}
        </span>
        
        {order.status === 'pending' && (
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleRefundOrder(order)}
              className="border-red-600 text-red-600 hover:bg-red-600/10"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Refund
            </Button>
            <Button 
              size="sm"
              onClick={() => updateOrderStatus(order.id, 'in_progress')}
              className="bg-gradient-coffee hover:opacity-90"
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          </div>
        )}
        
        {order.status === 'in_progress' && (
          <Button 
            size="sm"
            variant="outline"
            onClick={() => updateOrderStatus(order.id, 'completed')}
            className="border-green-600 text-green-600 hover:bg-green-600/10"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="flex-1 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold text-foreground">Order Queue</h2>
      </div>
      
      <Tabs defaultValue="active" className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-2 m-4 flex-shrink-0">
          <TabsTrigger value="active">
            Active Orders ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="flex-1 min-h-0 m-0 px-4">
          <ScrollArea className="h-full">
            {activeOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="completed" className="flex-1 min-h-0 m-0 px-4">
          <ScrollArea className="h-full">
            {completedOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <RefundOrderDialog
          isOpen={refundDialogOpen}
          onClose={() => setRefundDialogOpen(false)}
          order={selectedOrder}
          onRefundComplete={handleRefundComplete}
        />
      )}
    </div>
  );
};

export default OrderTracker;