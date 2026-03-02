import { Suspense } from "react";
import {
  Package,
  ClipboardList,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/shared/loading-skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { getBookingStats, getBookings } from "@/actions/bookings";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

async function AdminDashboardContent() {
  const [stats, recentBookings] = await Promise.all([
    getBookingStats(),
    getBookings(),
  ]);

  const recent = recentBookings?.slice(0, 8) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the PMO Equipment Booking System
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Equipment
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEquipment}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Bookings
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <ClipboardList className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              Currently borrowed
            </p>
          </CardContent>
        </Card>

        <Card className={stats.overdueBookings > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.overdueBookings > 0 ? "text-red-600" : ""}`}>
              {stats.overdueBookings}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card className={stats.pendingBookings > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.pendingBookings > 0 ? "text-amber-600" : ""}`}>
              {stats.pendingBookings}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Inventory Alert */}
      {stats.lowInventory.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Low Inventory Alert
            </CardTitle>
            <CardDescription>
              These items have limited availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.lowInventory.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2"
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <Badge variant="warning">
                    {item.available_quantity}/{item.total_quantity} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest booking requests</CardDescription>
          </div>
          <Link href="/admin/bookings">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No bookings yet
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((booking: any) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fsuu-blue-50">
                      <ClipboardList className="h-5 w-5 text-fsuu-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.borrower_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.equipment?.name} &middot; x{booking.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right text-sm md:block">
                      <p className="text-muted-foreground">
                        {formatDateTime(booking.borrow_date)}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
