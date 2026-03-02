import { Suspense } from "react";
import { getEquipment } from "@/actions/equipment";
import { getCurrentUser } from "@/actions/auth";
import { BookingForm } from "@/components/borrower/booking-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/shared/loading-skeletons";
import { redirect } from "next/navigation";

async function BookFormContent() {
  const [user, equipment] = await Promise.all([
    getCurrentUser(),
    getEquipment(),
  ]);

  if (!user) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Booking Form</CardTitle>
        <CardDescription>
          Select equipment, fill in details, and submit your booking request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BookingForm equipment={equipment || []} user={user} />
      </CardContent>
    </Card>
  );
}

export default function BookEquipmentPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book Equipment</h1>
        <p className="text-muted-foreground">
          Browse available equipment and submit a booking request
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <BookFormContent />
      </Suspense>
    </div>
  );
}
