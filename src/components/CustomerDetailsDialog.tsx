import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gift, TrendingUp, Calendar, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  points: number;
  total_spent: number;
  visit_count: number;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  points: number;
  description: string;
  created_at: string;
}

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onUpdate: () => void;
}

const CustomerDetailsDialog = ({
  isOpen,
  onClose,
  customer,
}: CustomerDetailsDialogProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customer) {
      loadTransactions();
    }
  }, [isOpen, customer]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{customer.name}</h3>
            {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Points</p>
                  <p className="font-bold">{Number(customer.points).toFixed(0)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="font-bold">${Number(customer.total_spent).toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Visits</p>
                  <p className="font-bold">{customer.visit_count}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="font-bold text-xs">
                    {format(new Date(customer.created_at), 'MMM yyyy')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Recent Activity</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              ) : (
                transactions.map((transaction) => (
                  <Card key={transaction.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge variant={transaction.type === 'earn' ? 'default' : 'secondary'}>
                        {transaction.type === 'earn' ? '+' : '-'}
                        {Number(transaction.points).toFixed(0)} pts
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
