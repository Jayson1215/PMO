import { Suspense } from "react";
import { getUserBookings } from "@/actions/bookings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatTimeRemaining } from "@/lib/utils";
import { ClipboardList, Package, Calendar, Clock } from "lucide-react";
import Link from "next/link";

async function MyBookingsContent() {
  const bookings = await getUserBookings();

  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
        title="No bookings yet"
        description="You haven't made any equipment bookings. Start by browsing available equipment."
        action={
          <Link href="/dashboard/book">
            <Button variant="fsuu">Book Equipment</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking: any) => (
        <div
          key={booking.id}
          className="rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-fsuu-blue-50">
                <Package className="h-6 w-6 text-fsuu-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{booking.equipment?.name}</p>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Qty: {booking.quantity} &middot;{" "}
                  <span className="font-mono text-xs">{booking.booking_code}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(booking.borrow_date)}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDateTime(booking.return_date)}
              </div>
              {['approved', 'borrowed', 'overdue'].includes(booking.status) && (
                <p className={`text-xs font-medium ${
                  booking.status === 'overdue' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {formatTimeRemaining(booking.return_date)}
                </p>
              )}
            </div>
          </div>
          {booking.purpose && (
            <div className="mt-3 rounded-md bg-gray-50 p-2.5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Purpose:</span> {booking.purpose}
              </p>
            </div>
          )}
          {booking.admin_notes && (
            <div className="mt-2 rounded-md bg-amber-50 p-2.5">
              <p className="text-xs text-amber-800">
                <span className="font-medium">Admin Notes:</span>{" "}
                {booking.admin_notes}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-muted-foreground">
            View and track all your equipment bookings
          </p>
        </div>
        <Link href="/dashboard/book">
          <Button variant="fsuu">New Booking</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<TableSkeleton rows={5} />}>
            <MyBookingsContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
