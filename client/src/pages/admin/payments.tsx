import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, CreditCard, TrendingUp, ShoppingCart, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CreditPurchase {
  id: number;
  userId: string;
  credits: number;
  amountPaid: number;
  stripeSessionId: string | null;
  createdAt: string;
  userEmail: string | null;
}

interface PaymentStats {
  totalRevenue: number;
  totalPurchases: number;
  totalCreditsSold: number;
  averageOrderValue: number;
}

export default function AdminPayments() {
  const { data: purchases, isLoading: purchasesLoading, error: purchasesError } = useQuery<CreditPurchase[]>({
    queryKey: ["/api/admin/payments"],
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<PaymentStats>({
    queryKey: ["/api/admin/payments/stats"],
  });

  if (purchasesError || statsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments & Purchases</h1>
          <p className="text-muted-foreground">
            View credit purchases and revenue analytics
          </p>
        </div>
        <Alert variant="destructive" data-testid="alert-payments-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load payment data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getPackageName = (credits: number) => {
    if (credits === 3) return "Basic Pack";
    if (credits === 12) return "Value Pack";
    if (credits === 30) return "Pro Pack";
    return `${credits} Credits`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments & Purchases</h1>
        <p className="text-muted-foreground">
          View credit purchases and revenue analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {statsLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-purchases">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-purchases">
              {statsLoading ? "..." : stats?.totalPurchases || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-credits-sold">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Sold</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credits-sold">
              {statsLoading ? "..." : stats?.totalCreditsSold || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-avg-order">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-order">
              {statsLoading ? "..." : formatCurrency(stats?.averageOrderValue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-purchases-table">
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {purchasesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : purchases?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-purchases">
              No purchases yet
            </div>
          ) : (
            <Table data-testid="table-purchases">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases?.map((purchase) => (
                  <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                    <TableCell className="text-sm" data-testid={`text-purchase-date-${purchase.id}`}>
                      {formatDate(purchase.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium" data-testid={`text-purchase-customer-${purchase.id}`}>
                          {purchase.userEmail || "Anonymous"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {purchase.userId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-purchase-package-${purchase.id}`}>
                        {getPackageName(purchase.credits)}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-purchase-credits-${purchase.id}`}>{purchase.credits}</TableCell>
                    <TableCell className="font-medium" data-testid={`text-purchase-amount-${purchase.id}`}>
                      {formatCurrency(purchase.amountPaid)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600" data-testid={`badge-purchase-status-${purchase.id}`}>
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
