import { Suspense } from "react";
import { getBookingStats, getBookings } from "@/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/shared/loading-skeletons";
import { BarChart3, TrendingUp, Package, Calendar } from "lucide-react";

async function AnalyticsContent() {
  const [stats, bookings] = await Promise.all([
    getBookingStats(),
    getBookings(),
  ]);

  // Calculate simple analytics
  const statusCounts: Record<string, number> = {};
  bookings?.forEach((b: any) => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });

  const departmentCounts: Record<string, number> = {};
  bookings?.forEach((b: any) => {
    const dept = b.department || b.organization || "Unspecified";
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });

  const topDepartments = Object.entries(departmentCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const equipmentUsage: Record<string, number> = {};
  bookings?.forEach((b: any) => {
    const name = b.equipment?.name || "Unknown";
    equipmentUsage[name] = (equipmentUsage[name] || 0) + 1;
  });

  const topEquipment = Object.entries(equipmentUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.totalBookings > 0
                ? Math.round(((statusCounts["returned"] || 0) / stats.totalBookings) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equipment Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalEquipment}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-fsuu-blue-600" />
              Booking Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-20 text-sm capitalize">{status}</span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          status === "returned" ? "bg-green-500" :
                          status === "approved" ? "bg-blue-500" :
                          status === "pending" ? "bg-yellow-500" :
                          status === "overdue" ? "bg-red-500" :
                          status === "rejected" ? "bg-red-400" :
                          "bg-gray-400"
                        }`}
                        style={{
                          width: `${Math.max(5, (count / (stats.totalBookings || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Equipment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-fsuu-gold-400" />
              Most Borrowed Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topEquipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topEquipment.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fsuu-blue-50 text-xs font-semibold text-fsuu-blue-600">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm">{name}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Departments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Top Borrowing Departments/Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {topDepartments.map(([dept, count]) => (
                  <div
                    key={dept}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium">{dept}</span>
                    <span className="text-sm font-bold text-fsuu-blue-600">
                      {count} booking{count !== 1 ? "s" : ""}
                    </span>
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

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-muted-foreground">
          System usage statistics and insights
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
