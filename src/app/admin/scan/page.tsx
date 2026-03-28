"use client";

import { useState } from "react";
import { getBookingById, updateBookingStatus } from "@/actions/bookings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { QrCode, Search, Loader2, CheckCircle2, XCircle, ArrowLeftRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

export default function AdminScanPage() {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleSearch(idToSearch?: string) {
    const id = idToSearch || bookingId;
    if (!id) return;

    setLoading(true);
    setBooking(null);
    try {
      const data = await getBookingById(id);
      if (data) {
        setBooking(data);
      } else {
        toast.error("Booking not found", {
          description: "Please check the ID or try again.",
        });
      }
    } catch (error) {
      toast.error("Error fetching booking");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(newStatus: 'borrowed' | 'returned') {
    if (!booking) return;

    setActionLoading(true);
    try {
      const result = await updateBookingStatus(booking.id, newStatus);
      if (result.success) {
        toast.success(`Booking marked as ${newStatus}`);
        // Refresh booking details
        handleSearch(booking.id);
      } else {
        toast.error(result.error as string);
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fsuu-blue-600">
          <QrCode className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Scan & Lookup</h1>
          <p className="text-muted-foreground">Scan QR codes or enter Booking IDs for rapid actions</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Scan / Lookup</CardTitle>
          <CardDescription>Enter the Booking ID from the QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter Booking ID (e.g. uuid-format)"
                className="pl-10"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={loading} variant="fsuu">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {booking && (
        <Card className="max-w-2xl border-fsuu-blue-100 shadow-lg">
          <CardHeader className="border-b bg-fsuu-blue-50/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">{booking.booking_code}</CardTitle>
                <CardDescription>Booking Details</CardDescription>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Equipment</h3>
                  <div className="mt-1 flex items-center gap-3">
                    {booking.equipment?.image_url ? (
                      <div className="h-10 w-10 overflow-hidden rounded-md border">
                        <Image 
                          src={booking.equipment.image_url} 
                          alt={booking.equipment.name} 
                          width={40} 
                          height={40} 
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 border">
                        <QrCode className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{booking.equipment?.name}</p>
                      <p className="text-xs text-muted-foreground">Quantity: {booking.quantity}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Borrower</h3>
                  <p className="mt-1 font-medium">{booking.borrower_name}</p>
                  <p className="text-xs text-muted-foreground">{booking.department} &middot; {booking.borrower_email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Schedule</h3>
                  <div className="mt-1 text-sm space-y-1">
                    <p className="flex justify-between"><span className="text-muted-foreground">Borrow:</span> <span>{formatDateTime(booking.borrow_date)}</span></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Return:</span> <span>{formatDateTime(booking.return_date)}</span></p>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h3>
                  <div className="flex flex-col gap-2">
                    {booking.status === 'approved' && (
                      <Button 
                        className="w-full gap-2" 
                        variant="fsuu"
                        onClick={() => handleStatusUpdate('borrowed')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Mark as Borrowed
                      </Button>
                    )}
                    {booking.status === 'borrowed' && (
                      <Button 
                        className="w-full gap-2" 
                        variant="default"
                        onClick={() => handleStatusUpdate('returned')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                        Mark as Returned
                      </Button>
                    )}
                    {(booking.status !== 'approved' && booking.status !== 'borrowed') && (
                      <p className="text-xs text-center text-muted-foreground italic border rounded p-2 bg-gray-50">
                        No quick actions available for this status.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
