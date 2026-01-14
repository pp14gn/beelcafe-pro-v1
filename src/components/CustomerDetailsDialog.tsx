import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Gift, TrendingUp, Calendar, History, Cake, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import MembershipTierBadge, { getTierInfo } from "@/components/loyalty/MembershipTierBadge";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  points: number;
  total_spent: number;
  visit_count: number;
  created_at: string;
  birthday?: string | null;
  membership_tier?: string;
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
  onUpdate,
}: CustomerDetailsDialogProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: customer.name,
    email: customer.email || "",
    phone: customer.phone || "",
    birthday: customer.birthday || "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && customer) {
      loadTransactions();
      setEditData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        birthday: customer.birthday || "",
      });
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

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editData.name,
          email: editData.email || null,
          phone: editData.phone || null,
          birthday: editData.birthday || null,
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast({ title: "Customer updated successfully" });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const tierInfo = getTierInfo(customer.membership_tier || 'bronze');
  const nextTierSpent = customer.membership_tier === 'gold' ? null :
    customer.membership_tier === 'silver' ? 100 - Number(customer.total_spent) : 50 - Number(customer.total_spent);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Customer Details</DialogTitle>
            {!isEditing ? (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Input
                  type="date"
                  value={editData.birthday}
                  onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{customer.name}</h3>
                {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                {customer.birthday && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Cake className="h-3 w-3" />
                    {format(new Date(customer.birthday), 'MMMM dd')}
                  </p>
                )}
              </div>
              <MembershipTierBadge tier={customer.membership_tier || 'bronze'} />
            </div>
          )}

          {/* Tier Progress */}
          {nextTierSpent && nextTierSpent > 0 && (
            <Card className="p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Spend ${nextTierSpent.toFixed(2)} more to reach {customer.membership_tier === 'bronze' ? 'Silver' : 'Gold'} tier 
                ({tierInfo.multiplier}x → {customer.membership_tier === 'bronze' ? '1.25x' : '1.5x'} points)
              </p>
            </Card>
          )}

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
            <div className="space-y-2 max-h-48 overflow-y-auto">
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