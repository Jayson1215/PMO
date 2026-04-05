/**
 * ADMIN BOOKINGS PAGE (admin/bookings/page.tsx)
 * -------------------------------------------
 * Functionality: Main interface for admins to review, approve, and reject equipment requests.
 * Connection: Fetches all bookings from the database and uses 'BookingActions' for status updates.
 */
import { Suspense } from "react";
import { getBookings } from "@/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { BookingActions } from "@/components/admin/booking-actions";
import { formatDateTime } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

/**
 * BOOKING LIST LOADER
 * Functionality: Safely retrieves the full list of requests from the server.
 * Connection: Connects to 'getBookings' action.
 */
async function BookingsContent() {
  const bookings = await getBookings();

  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
        title="No bookings yet"
        description="Booking requests from borrowers will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking: any) => (
        <div
          key={booking.id}
          className="flex flex-col gap-4 rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-fsuu-blue-50">
              <ClipboardList className="h-6 w-6 text-fsuu-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{booking.borrower_name}</p>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.equipment?.name} &middot; Qty: {booking.quantity} &middot;{" "}
                <span className="font-mono text-xs">{booking.booking_code}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(booking.borrow_date)} &rarr;{" "}
                {formatDateTime(booking.return_date)}
              </p>
            </div>
          </div>
          <BookingActions booking={booking} />
        </div>
      ))}
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Bookings</h1>
        <p className="text-muted-foreground">
          Review, approve, or reject equipment booking requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            Manage all equipment booking requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton rows={6} />}>
            <BookingsContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
