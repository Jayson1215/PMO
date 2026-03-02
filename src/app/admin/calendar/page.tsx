import { Suspense } from "react";
import { getCalendarBookings } from "@/actions/bookings";
import { BookingCalendar } from "@/components/admin/booking-calendar";
import { DashboardSkeleton } from "@/components/shared/loading-skeletons";
import { startOfMonth, endOfMonth, format } from "date-fns";

async function CalendarContent() {
  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00");
  const end = format(endOfMonth(now), "yyyy-MM-dd'T'23:59:59");
  const events = await getCalendarBookings(start, end);

  return <BookingCalendar events={events || []} />;
}

export default function AdminCalendarPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
        <p className="text-muted-foreground">
          Visual overview of all equipment bookings
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <CalendarContent />
      </Suspense>
    </div>
  );
}
