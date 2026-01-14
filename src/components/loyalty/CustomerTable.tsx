import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MembershipTierBadge from "./MembershipTierBadge";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  points: number;
  total_spent: number;
  visit_count: number;
  created_at: string;
  birthday: string | null;
  membership_tier: string;
}

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCustomerClick: (customer: Customer) => void;
}

const CustomerTable = ({
  customers,
  loading,
  searchQuery,
  onSearchChange,
  onCustomerClick,
}: CustomerTableProps) => {
  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Total Spent</TableHead>
            <TableHead>Visits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <TableRow
                key={customer.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onCustomerClick(customer)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.email || customer.phone || 'No contact'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <MembershipTierBadge tier={customer.membership_tier} size="sm" />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {Number(customer.points).toFixed(0)} pts
                  </Badge>
                </TableCell>
                <TableCell>${Number(customer.total_spent).toFixed(2)}</TableCell>
                <TableCell>{customer.visit_count}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export default CustomerTable;