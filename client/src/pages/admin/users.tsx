import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Users, Coins, CreditCard, Search, Loader2, AlertCircle, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type AddCreditsRequest } from "@shared/schema";
import { z } from "zod";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  credits: number;
  stripeCustomerId: string | null;
  createdAt: string | null;
}

interface UsersStats {
  totalUsers: number;
  usersWithCredits: number;
  totalCredits: number;
  stripeCustomers: number;
}

const formSchema = z.object({
  credits: z.coerce.number().int("Credits must be a whole number").min(1, "Must add at least 1 credit").max(10000, "Cannot add more than 10,000 credits at once"),
});

const editFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  credits: z.coerce.number().int("Credits must be a whole number").min(0, "Credits cannot be negative"),
});

type AddCreditsForm = AddCreditsRequest;
type EditUserForm = z.infer<typeof editFormSchema>;

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddCreditsForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credits: 10,
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      credits: 0,
    },
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<UsersStats>({
    queryKey: ["/api/admin/users/stats"],
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    },
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({ userId, credits }: { userId: string; credits: number }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/add-credits`, { credits });

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credits Added",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setIsAddCreditsOpen(false);
      setSelectedUser(null);
      form.reset({ credits: 10 });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Credits",
        description: error.message || "An error occurred while adding credits",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserForm }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User Updated", description: "User info has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setIsEditUserOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update User",
        description: error.message || "An error occurred while updating user",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const response = await apiRequest("POST", "/api/admin/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User Created", description: "New user account has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateUserOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User Deleted", description: "User has been permanently deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setIsDeleteUserOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete User",
        description: error.message || "An error occurred while deleting user",
        variant: "destructive",
      });
    },
  });

  const handleOpenAddCredits = (user: User) => {
    setSelectedUser(user);
    form.reset({ credits: 10 });
    setIsAddCreditsOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      credits: user.credits,
    });
    setIsEditUserOpen(true);
  };

  const handleAddCredits = (data: AddCreditsForm) => {
    if (!selectedUser) return;
    addCreditsMutation.mutate({ userId: selectedUser.id, credits: data.credits });
  };

  const handleEditUser = (data: EditUserForm) => {
    if (!selectedUser) return;
    updateUserMutation.mutate({ userId: selectedUser.id, data });
  };

  if (usersError || statsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Users & Accounts</h1>
          <p className="text-muted-foreground">
            Manage user accounts and view credit balances
          </p>
        </div>
        <Alert variant="destructive" data-testid="alert-users-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load user data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleOpenDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  const filteredUsers = users?.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.id.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email || "Anonymous";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users & Accounts</h1>
        <p className="text-muted-foreground">
          Manage user accounts and view credit balances
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-total-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          <Button size="sm" onClick={() => setIsCreateUserOpen(true)}>
            Create User
          </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {statsLoading ? "..." : stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-users-with-credits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-users-with-credits">
              {statsLoading ? "..." : stats?.usersWithCredits || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-total-credits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-credits">
              {statsLoading ? "..." : stats?.totalCredits || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-stripe-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stripe Customers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stripe-customers">
              {statsLoading ? "..." : stats?.stripeCustomers || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-users-table">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table data-testid="table-users">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-users">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                              : "Anonymous"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {user.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-user-email-${user.id}`}>{user.email || "No email"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role || "user"}
                      onChange={(e) => changeRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                      disabled={changeRoleMutation.isPending}
                      className={`rounded-md border px-2 py-1 text-xs font-medium cursor-pointer ${
                        user.role === "superadmin" ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700" :
                        user.role === "admin" ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700" :
                        "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                    {(user as any).isAmbassador && (
                      <Star className="h-4 w-4 text-purple-500" data-testid={`icon-user-ambassador-${user.id}`} />
                    )}
                  </div>
                </TableCell>
                      <TableCell>
                        <Badge variant={user.credits > 0 ? "default" : "secondary"} data-testid={`badge-user-credits-${user.id}`}>
                          {user.credits} credits
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.stripeCustomerId ? (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-stripe-connected-${user.id}`}>
                            Connected
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDeleteUser(user)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAddCredits(user)}
                            data-testid={`button-add-credits-${user.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Credits
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddCreditsOpen} onOpenChange={setIsAddCreditsOpen}>
        <DialogContent data-testid="dialog-add-credits">
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription data-testid="text-add-credits-description">
              Add credits to {selectedUser ? getUserDisplayName(selectedUser) : "user"}'s account.
              Current balance: <strong data-testid="text-current-balance">{selectedUser?.credits || 0} credits</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCredits)} className="space-y-4">
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter credits to add"
                        {...field}
                        data-testid="input-credits-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue("credits", amount)}
                    data-testid={`button-quick-add-${amount}`}
                  >
                    +{amount}
                  </Button>
                ))}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddCreditsOpen(false)}
                  data-testid="button-cancel-add-credits"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addCreditsMutation.isPending}
                  data-testid="button-confirm-add-credits"
                >
                  {addCreditsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Credits
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update info for {selectedUser ? getUserDisplayName(selectedUser) : "user"}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Credits" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-1" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Create a new user account manually.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createUserMutation.mutate({
                email: fd.get("email") as string,
                password: fd.get("password") as string,
                firstName: fd.get("firstName") as string,
                lastName: fd.get("lastName") as string,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="cu-email">Email *</Label>
              <Input id="cu-email" name="email" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cu-password">Password *</Label>
              <Input id="cu-password" name="password" type="password" required minLength={6} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cu-firstName">First Name</Label>
              <Input id="cu-firstName" name="firstName" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cu-lastName">Last Name</Label>
              <Input id="cu-lastName" name="lastName" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedUser?.firstName} {selectedUser?.lastName} ({selectedUser?.email})? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteUserOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
