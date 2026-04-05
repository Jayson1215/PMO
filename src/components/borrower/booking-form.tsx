/**
 * BOOKING FORM COMPONENT (booking-form.tsx)
 * -----------------------------------------
 * Functionality: Interactive form used by students to select equipment and schedule a borrow date.
 * Connection: Submits validated data to the 'createBooking' server action.
 */
"use client";

import { useState, useTransition } from "react";
import { createBooking } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, Package } from "lucide-react";
import Image from "next/image";
import type { EquipmentWithCategory, Profile } from "@/types/database";

interface BookingFormProps {
  equipment: EquipmentWithCategory[];
  user: Profile;
}

export function BookingForm({ equipment, user }: BookingFormProps) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);

  const selectedEquipment = equipment.find((e) => e.id === selectedEquipmentId);
  const availableEquipment = equipment.filter(
    (e) => e.status === "available" && e.available_quantity > 0
  );

  /**
   * SUBMISSION HANDLER
   * Functionality: Adjusts the date for Philippines Timezone (+08:00) before sending to database.
   * Connection: Communicates with 'bookings.ts' and triggers the Success Dialog upon completion.
   */
  function handleSubmit(formData: FormData) {
    // Append Philippines timezone offset (+08:00) to datetime-local values
    // so the server stores the correct absolute time in TIMESTAMPTZ
    const borrowDate = formData.get('borrow_date') as string;
    const returnDate = formData.get('return_date') as string;
    if (borrowDate && !borrowDate.includes('+') && !borrowDate.includes('Z')) {
      formData.set('borrow_date', borrowDate + ':00+08:00');
    }
    if (returnDate && !returnDate.includes('+') && !returnDate.includes('Z')) {
      formData.set('return_date', returnDate + ':00+08:00');
    }

    startTransition(async () => {
      const result = await createBooking(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setSuccessBooking(result.booking);
        setShowSuccess(true);
        toast.success("Booking request submitted successfully!");
      }
    });
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        {/* Equipment Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Select Equipment</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {availableEquipment.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedEquipmentId(item.id)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-all ${
                  selectedEquipmentId === item.id
                    ? "border-fsuu-blue-500 bg-fsuu-blue-50 ring-2 ring-fsuu-blue-200"
                    : "hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="font-medium">{item.name}</p>
                {item.equipment_categories && (
                  <p className="text-xs text-muted-foreground">
                    {item.equipment_categories.name}
                  </p>
                )}
                <Badge
                  variant={item.available_quantity > 2 ? "success" : "warning"}
                  className="mt-2"
                >
                  {item.available_quantity} available
                </Badge>
              </button>
            ))}
          </div>
          <input type="hidden" name="equipment_id" value={selectedEquipmentId} />
        </div>

        {selectedEquipment && (
          <>
            {/* Quantity */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  max={selectedEquipment.available_quantity}
                  defaultValue={1}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Max: {selectedEquipment.available_quantity}
                </p>
              </div>
            </div>

            {/* Borrower Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Borrower Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="borrower_name">Full Name *</Label>
                  <Input
                    id="borrower_name"
                    name="borrower_name"
                    defaultValue={user.full_name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borrower_email">Email *</Label>
                  <Input
                    id="borrower_email"
                    name="borrower_email"
                    type="email"
                    defaultValue={user.email}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    defaultValue={user.department || ""}
                    placeholder="e.g., College of IT"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Schedule</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="borrow_date">Borrow Date & Time *</Label>
                  <Input
                    id="borrow_date"
                    name="borrow_date"
                    type="datetime-local"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return_date">Return Date & Time *</Label>
                  <Input
                    id="return_date"
                    name="return_date"
                    type="datetime-local"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                name="purpose"
                placeholder="Describe the purpose of borrowing this equipment..."
                required
                className="min-h-[100px]"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button type="submit" variant="fsuu" size="lg" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Booking Request"
                )}
              </Button>
            </div>
          </>
        )}
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-center">Booking Submitted!</DialogTitle>
            <DialogDescription className="text-center">
              Your booking request has been submitted and is pending approval by
              the PMO staff.
            </DialogDescription>
          </DialogHeader>
          {successBooking && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Booking Code:</span>{" "}
                <span className="font-mono font-semibold">
                  {successBooking.booking_code}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="fsuu"
              className="w-full"
              onClick={() => {
                setShowSuccess(false);
                setSelectedEquipmentId("");
              }}
            >
              Book More Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
