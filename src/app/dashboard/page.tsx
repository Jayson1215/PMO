import { Suspense } from "react";
import Link from "next/link";
import { getUserBookings } from "@/actions/bookings";
import { getCurrentUser } from "@/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeletons";
import { formatDateTime, formatTimeRemaining } from "@/lib/utils";
import {
  Calendar,
  ClipboardList,
  Clock,
  Package,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

async function BorrowerDashboardContent() {
  const [user, bookings] = await Promise.all([
    getCurrentUser(),
    getUserBookings(),
  ]);

  const activeBookings = bookings?.filter((b) =>
    ["approved", "borrowed"].includes(b.status)
  ) || [];
  const pendingBookings = bookings?.filter((b) => b.status === "pending") || [];
  const overdueBookings = bookings?.filter((b) => b.status === "overdue") || [];
  const recentBookings = bookings?.slice(0, 5) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          Your PMO equipment booking dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Bookings
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingBookings.length}</div>
          </CardContent>
        </Card>

        <Card className={overdueBookings.length > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overdueBookings.length > 0 ? "text-red-600" : ""}`}>
              {overdueBookings.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
              <Package className="h-5 w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bookings?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueBookings.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Equipment — Immediate Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueBookings.map((booking: any) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-3"
                >
                  <div>
                    <p className="font-medium">{booking.equipment?.name}</p>
                    <p className="text-sm text-red-600">
                      {formatTimeRemaining(booking.return_date)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDateTime(booking.return_date)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Action + Recent Bookings */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Action */}
        <Card className="border-fsuu-blue-100 bg-gradient-to-br from-fsuu-blue-50 to-white">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fsuu-blue-100">
              <Calendar className="h-8 w-8 text-fsuu-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Book Equipment</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Browse and reserve available equipment
            </p>
            <Link href="/dashboard/book">
              <Button variant="fsuu" className="gap-2">
                Book Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your latest booking activity</CardDescription>
            </div>
            <Link href="/dashboard/bookings">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <EmptyState
                title="No bookings yet"
                description="Start by booking equipment from the catalog."
                action={
                  <Link href="/dashboard/book">
                    <Button variant="fsuu" size="sm">
                      Book Equipment
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <Package className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.equipment?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(booking.borrow_date)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BorrowerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BorrowerDashboardContent />
    </Suspense>
  );
}
