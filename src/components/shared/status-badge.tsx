import { cn, getStatusColor } from "@/lib/utils";
import type { BookingStatus, EquipmentStatus } from "@/types/database";

interface StatusBadgeProps {
  status: BookingStatus | EquipmentStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors",
        getStatusColor(status),
        className
      )}
    >
      {status}
    </span>
  );
}
