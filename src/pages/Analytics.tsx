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
  Calendar
} from "lucide-react";

const Analytics = () => {
  const salesData = [
    { id: "1", item: "Latte", quantity: 45, revenue: 202.50, staff: "Sarah W.", time: "08:30", date: "2024-01-16" },
    { id: "2", item: "Americano", quantity: 32, revenue: 96.00, staff: "Mike J.", time: "09:15", date: "2024-01-16" },
    { id: "3", item: "Cappuccino", quantity: 28, revenue: 112.00, staff: "Emily C.", time: "07:45", date: "2024-01-16" },
    { id: "4", item: "Breakfast Sandwich", quantity: 18, revenue: 130.50, staff: "Sarah W.", time: "08:00", date: "2024-01-16" },
    { id: "5", item: "Espresso", quantity: 55, revenue: 137.50, staff: "John D.", time: "09:30", date: "2024-01-16" },
  ];

  const staffPerformance = [
    { name: "Sarah Wilson", sales: 8920.50, orders: 342, hours: 140, avgPerHour: 63.72 },
    { name: "John Doe", sales: 12450.00, orders: 456, hours: 160, avgPerHour: 77.81 },
    { name: "Mike Johnson", sales: 7650.25, orders: 298, hours: 135, avgPerHour: 56.67 },
    { name: "Emily Chen", sales: 9850.75, orders: 387, hours: 150, avgPerHour: 65.67 },
  ];

  const topItems = [
    { name: "Latte", sold: 234, revenue: 1053.00 },
    { name: "Americano", sold: 198, revenue: 594.00 },
    { name: "Cappuccino", sold: 156, revenue: 624.00 },
    { name: "Espresso", sold: 189, revenue: 472.50 },
    { name: "Breakfast Sandwich", sold: 87, revenue: 630.75 },
  ];

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
              <p className="text-2xl font-bold text-coffee-gold">$2,847</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12.5% vs yesterday
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
              <p className="text-2xl font-bold text-pos-info">178</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8.2% vs yesterday
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
              <p className="text-2xl font-bold text-coffee-bean">$16.00</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +3.8% vs yesterday
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
              <p className="text-2xl font-bold text-pos-success">3.2m</p>
              <p className="text-xs text-pos-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                5s faster
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
              Top Selling Items
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coffee-gold/10">
                      <span className="text-sm font-semibold text-coffee-gold">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.sold} sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-coffee-gold">
                      ${item.revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Staff Performance */}
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Performance
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {staffPerformance.map((staff, index) => (
                <div key={staff.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-coffee-cream flex items-center justify-center">
                      <span className="text-sm font-semibold text-coffee-bean">
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {staff.orders} orders • {staff.hours}h
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-coffee-gold">
                      ${staff.sales.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${staff.avgPerHour.toFixed(2)}/hr
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

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
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesData.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.item}</TableCell>
                <TableCell>
                  <Badge variant="outline">{sale.quantity}</Badge>
                </TableCell>
                <TableCell className="font-semibold text-coffee-gold">
                  ${sale.revenue.toFixed(2)}
                </TableCell>
                <TableCell>{sale.staff}</TableCell>
                <TableCell className="text-muted-foreground">{sale.time}</TableCell>
                <TableCell className="text-muted-foreground">{sale.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Analytics;