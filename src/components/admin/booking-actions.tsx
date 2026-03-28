"use client";

import { useState, useTransition } from "react";
import { updateBookingStatus, sendManualReminder } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Calendar,
  User,
  Package,
  Mail,
  Building,
  FileText,
  Bell,
  Send,
  MessageSquare,
} from "lucide-react";
import type { BookingStatus } from "@/types/database";

interface BookingActionsProps {
  booking: any;
}

export function BookingActions({ booking }: BookingActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyMethod, setNotifyMethod] = useState<'email' | 'sms' | 'both'>('email');
  const [isNotifying, startNotifyTransition] = useTransition();

  function handleStatusUpdate(status: BookingStatus, notes?: string) {
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, status, notes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Booking ${status} successfully`);
        setShowRejectDialog(false);
      }
    });
  }

  function handleNotifyBorrower() {
    if (!notifyMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    startNotifyTransition(async () => {
      const result = await sendManualReminder(
        booking.id, 
        notifyMessage, 
        notifyMethod
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Notification sent to borrower!', {
          description: result.details,
        });
        setShowNotifyDialog(false);
        setNotifyMessage('');
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetailDialog(true)}
        >
          View
        </Button>

        {booking.status === "pending" && (
          <>
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleStatusUpdate("approved")}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-1 h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowRejectDialog(true)}
              disabled={isPending}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </>
        )}

        {(booking.status === "approved" || booking.status === "borrowed" || booking.status === "overdue") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusUpdate("returned")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-4 w-4" />
            )}
            Mark Returned
          </Button>
        )}

        {booking.status !== "cancelled" && booking.status !== "rejected" && (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setShowNotifyDialog(true)}
            disabled={isPending || isNotifying}
          >
            <Bell className="mr-1 h-4 w-4" />
            Notify
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this booking request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate("rejected", rejectNotes)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify / Remind Dialog */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              Notify Borrower
            </DialogTitle>
            <DialogDescription>
              Send a reminder or message to <strong>{booking.borrower_name}</strong> ({booking.borrower_email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">Booking</p>
              <p className="text-sm font-medium">
                {booking.equipment?.name} &middot; {booking.booking_code}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Send via</Label>
              <Select value={notifyMethod} onValueChange={(v: 'email' | 'sms' | 'both') => setNotifyMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email (Gmail)</span>
                  </SelectItem>
                  <SelectItem value="sms">
                    <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> SMS</span>
                  </SelectItem>
                  <SelectItem value="both">
                    <span className="flex items-center gap-2"><Send className="h-3.5 w-3.5" /> Both Email &amp; SMS</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="e.g., Please return the equipment by 5:00 PM today."
                className="mt-1 min-h-[100px]"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  'Please return the equipment on time.',
                  'Your return deadline is approaching. Please prepare to return the equipment.',
                  'Kindly proceed to the PMO Office to return the borrowed equipment.',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNotifyMessage(preset)}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                  >
                    {preset.slice(0, 40)}{preset.length > 40 ? '...' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotifyDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleNotifyBorrower}
              disabled={isNotifying || !notifyMessage.trim()}
            >
              {isNotifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Booking Details
              <StatusBadge status={booking.status} />
            </DialogTitle>
            <DialogDescription>
              {booking.booking_code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Borrower</p>
                  <p className="text-sm font-medium">{booking.borrower_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{booking.borrower_email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Equipment</p>
                  <p className="text-sm font-medium">
                    {booking.equipment?.name} (x{booking.quantity})
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">
                    {booking.department || booking.organization || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Borrow Date</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(booking.borrow_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Return Date</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(booking.return_date)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Purpose</p>
                <p className="text-sm">{booking.purpose}</p>
              </div>
            </div>
            {booking.admin_notes && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-muted-foreground">Admin Notes</p>
                <p className="text-sm">{booking.admin_notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
