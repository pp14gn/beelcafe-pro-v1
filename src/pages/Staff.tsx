import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import AddStaffDialog from "@/components/AddStaffDialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Search, 
  UserCheck,
  Clock,
  DollarSign,
  Edit,
  Shield,
  Key
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: string;
  status: "active" | "inactive";
  hoursWorked: number;
  totalSales: number;
  lastLogin: string;
  permissions: string[];
}

const Staff = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map database users to StaffMember interface
      const mappedStaff: StaffMember[] = users?.map(user => ({
        id: user.id,
        name: user.full_name,
        username: user.username,
        role: user.role,
        status: user.is_active ? "active" : "inactive",
        hoursWorked: 0, // TODO: Calculate from shifts table
        totalSales: 0, // TODO: Calculate from sales table  
        lastLogin: new Date(user.updated_at).toLocaleString(),
        permissions: getPermissionsByRole(user.role)
      })) || [];

      setStaffData(mappedStaff);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsByRole = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['pos', 'inventory', 'staff', 'reports', 'settings'];
      case 'manager':
        return ['pos', 'inventory', 'staff', 'reports'];
      case 'shift_lead':
        return ['pos', 'inventory', 'reports'];
      default:
        return ['pos'];
    }
  };

  const roles = [
    { id: "all", name: "All Roles" },
    { id: "admin", name: "Admin" },
    { id: "manager", name: "Manager" },
    { id: "shift_lead", name: "Shift Lead" },
    { id: "cashier", name: "Cashier" }
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case "manager":
        return <Badge className="bg-coffee-gold/20 text-coffee-gold border-coffee-gold/30"><Shield className="h-3 w-3 mr-1" />Manager</Badge>;
      case "shift_lead":
        return <Badge variant="secondary" className="bg-coffee-bean/20 text-coffee-bean border-coffee-bean/30"><UserCheck className="h-3 w-3 mr-1" />Shift Lead</Badge>;
      default:
        return <Badge variant="outline"><Users className="h-3 w-3 mr-1" />Cashier</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" 
      ? <Badge className="bg-pos-success/20 text-pos-success border-pos-success/30">Active</Badge>
      : <Badge variant="secondary" className="bg-muted">Inactive</Badge>;
  };

  const filteredStaff = staffData.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || staff.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const activeStaff = staffData.filter(staff => staff.status === "active").length;
  const totalHours = staffData.reduce((sum, staff) => sum + staff.hoursWorked, 0);
  const totalSales = staffData.reduce((sum, staff) => sum + staff.totalSales, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff accounts, permissions, and performance</p>
        </div>
        <Button 
          className="gap-2 bg-gradient-coffee hover:opacity-90"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-pos-success/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-pos-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Staff</p>
              <p className="text-2xl font-bold text-pos-success">{activeStaff}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-pos-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold text-pos-info">{totalHours}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-coffee-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold text-coffee-gold">${totalSales.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-1">
            {roles.map((role) => (
              <Button
                key={role.id}
                variant={selectedRole === role.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRole(role.id)}
              >
                {role.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Staff Members</h3>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hours Worked</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading staff members...
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-coffee-gold/20 text-coffee-bean">
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {staff.permissions.length} permissions
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{staff.username}</TableCell>
                <TableCell>{getRoleBadge(staff.role)}</TableCell>
                <TableCell>{getStatusBadge(staff.status)}</TableCell>
                <TableCell>{staff.hoursWorked}h</TableCell>
                <TableCell className="font-semibold text-coffee-gold">
                  ${staff.totalSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {staff.lastLogin}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Key className="h-3 w-3" />
                      Reset Password
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Staff Dialog */}
      <AddStaffDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={() => {
          fetchStaffData(); // Reload staff data after adding
        }}
      />
    </div>
  );
};

export default Staff;