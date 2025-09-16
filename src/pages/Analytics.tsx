import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Users,
  Clock,
  Coffee,
  Calendar,
  Timer
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Analytics = () => {
  const [orderTimes, setOrderTimes] = useState<any[]>([]);
  const [averagePrepTime, setAveragePrepTime] = useState(0);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      await Promise.all([
        loadOrderAnalytics(),
        loadSalesData(),
        loadDashboardMetrics(),
        loadTopItemsData(),
        loadStaffPerformanceData()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load analytics data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (salesError) throw salesError;

      const revenue = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;
      const orderCount = salesData?.length || 0;
      
      setTotalRevenue(revenue);
      setTotalOrders(orderCount);
      setAvgOrderValue(orderCount > 0 ? revenue / orderCount : 0);
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    }
  };

  const loadSalesData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          users!inner(full_name)
        `)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const formattedData = (data || []).map(sale => ({
        id: sale.id,
        items: sale.items,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        staff: sale.users?.full_name || 'Unknown',
        time: new Date(sale.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        created_at: sale.created_at
      }));
      
      setSalesData(formattedData);
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const loadOrderAnalytics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('orders')
        .select('prep_time_seconds, completion_time, items')
        .eq('status', 'completed')
        .not('prep_time_seconds', 'is', null)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) throw error;

      setOrderTimes(data || []);
      
      if (data && data.length > 0) {
        const avgTime = data.reduce((sum, order) => sum + (order.prep_time_seconds || 0), 0) / data.length;
        setAveragePrepTime(avgTime);
      }
    } catch (error) {
      console.error('Error loading order analytics:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadTopItemsData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sales')
        .select('items')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) throw error;

      // Process items data to count quantities
      const itemCounts: { [key: string]: number } = {};
      
      data?.forEach(sale => {
        if (Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const itemName = item.name || 'Unknown Item';
            const quantity = item.quantity || 1;
            itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
          });
        }
      });

      // Convert to array and sort by quantity
      const topItemsArray = Object.entries(itemCounts)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopItems(topItemsArray);
    } catch (error) {
      console.error('Error loading top items data:', error);
    }
  };

  const loadStaffPerformanceData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sales')
        .select(`
          total_amount,
          users!inner(full_name)
        `)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) throw error;

      // Process sales data by staff
      const staffSales: { [key: string]: number } = {};
      
      data?.forEach(sale => {
        const staffName = sale.users?.full_name || 'Unknown';
        const amount = parseFloat(sale.total_amount.toString());
        staffSales[staffName] = (staffSales[staffName] || 0) + amount;
      });

      // Convert to array and sort by sales amount
      const staffArray = Object.entries(staffSales)
        .map(([name, sales]) => ({ name, sales: Math.round(sales * 100) / 100 }))
        .sort((a, b) => b.sales - a.sales);

      setStaffPerformance(staffArray);
    } catch (error) {
      console.error('Error loading staff performance data:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Analytics</h1>
          <p className="text-muted-foreground">Track performance, sales, and staff metrics</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="today">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Custom Range
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-coffee-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-coffee-gold">${totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Today's total
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-pos-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-2xl font-bold text-pos-info">{totalOrders}</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Today's total
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-bean/10 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-coffee-bean" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold text-coffee-bean">${avgOrderValue.toFixed(2)}</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Today's average
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-pos-success/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-pos-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Prep Time</p>
              <p className="text-2xl font-bold text-pos-success">
                {averagePrepTime > 0 ? formatTime(Math.round(averagePrepTime)) : "N/A"}
              </p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {orderTimes.length} orders today
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Selling Items (Today)
            </h3>
          </div>
          <div className="p-4">
            {topItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sales data today</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topItems} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="quantity" 
                    fill="hsl(var(--coffee-gold))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Staff Performance */}
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Performance (Today)
            </h3>
          </div>
          <div className="p-4">
            {staffPerformance.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sales data today</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={staffPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`$${value}`, 'Sales']}
                  />
                  <Bar 
                    dataKey="sales" 
                    fill="hsl(var(--coffee-bean))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Table */}
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Sales</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.slice(0, 5).map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">
                    {Array.isArray(sale.items) ? 
                      sale.items.map((item: any) => item.name || 'Unknown Item').join(', ') : 
                      'Multiple Items'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {Array.isArray(sale.items) ? 
                        sale.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 
                        1
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-coffee-gold">
                    ${parseFloat(sale.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{sale.staff}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Order Prep Times */}
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Today's Order Prep Times
            </h3>
          </div>
          <div className="p-4">
            {orderTimes.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed orders today</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {orderTimes.slice(-10).reverse().map((order, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-coffee-cream flex items-center justify-center">
                        <Coffee className="h-4 w-4 text-coffee-bean" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.completion_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-coffee-gold">
                        {formatTime(order.prep_time_seconds)}
                      </p>
                      <p className="text-xs text-muted-foreground">prep time</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;