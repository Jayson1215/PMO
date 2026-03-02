"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  booking_code: string;
  borrow_date: string;
  return_date: string;
  status: string;
  borrower_name: string;
  quantity: number;
  equipment: { name: string } | null;
}

interface BookingCalendarProps {
  events: CalendarEvent[];
}

export function BookingCalendar({ events }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function getEventsForDate(date: Date) {
    return events.filter((event) => {
      const borrowDate = new Date(event.borrow_date);
      const returnDate = new Date(event.return_date);
      return date >= new Date(borrowDate.toDateString()) && date <= new Date(returnDate.toDateString());
    });
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-2 text-xs font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayEvents = getEventsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex min-h-[80px] flex-col items-start border-t p-1.5 text-sm transition-colors hover:bg-gray-50",
                    !isSameMonth(day, currentMonth) && "text-gray-300",
                    isSelected && "bg-fsuu-blue-50 ring-2 ring-fsuu-blue-200",
                    isToday(day) && "font-bold"
                  )}
                >
                  <span
                    className={cn(
                      "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-fsuu-blue-600 text-white"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "mb-0.5 w-full truncate rounded px-1 py-0.5 text-[10px]",
                        event.status === "approved" && "bg-green-100 text-green-700",
                        event.status === "pending" && "bg-yellow-100 text-yellow-700",
                        event.status === "borrowed" && "bg-blue-100 text-blue-700",
                        event.status === "overdue" && "bg-red-100 text-red-700"
                      )}
                    >
                      {event.equipment?.name || "Equipment"}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? format(selectedDate, "MMMM d, yyyy")
              : "Select a date"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground">
              Click on a date to view bookings
            </p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings for this date
            </p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {event.equipment?.name}
                    </span>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.borrower_name} &middot; Qty: {event.quantity}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {event.booking_code}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
