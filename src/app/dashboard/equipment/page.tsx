import { Suspense } from "react";
import { getEquipment } from "@/actions/equipment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { Package } from "lucide-react";
import Image from "next/image";

async function EquipmentCatalogContent() {
  const equipment = await getEquipment();

  if (!equipment || equipment.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-8 w-8 text-gray-400" />}
        title="No equipment available"
        description="Equipment catalog is currently empty. Check back later."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {equipment.map((item: any) => (
        <Card key={item.id} className="overflow-hidden">
          <div className="relative h-36 bg-gray-100">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-gray-300" />
              </div>
            )}
            <div className="absolute right-2 top-2">
              <StatusBadge status={item.status} />
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold">{item.name}</h3>
            {item.equipment_categories && (
              <p className="text-xs text-muted-foreground">
                {item.equipment_categories.name}
              </p>
            )}
            {item.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={item.available_quantity > 0 ? "success" : "destructive"}>
                {item.available_quantity}/{item.total_quantity} available
              </Badge>
              {item.location && (
                <Badge variant="outline" className="text-xs">
                  {item.location}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BorrowerEquipmentPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Equipment Catalog</h1>
        <p className="text-muted-foreground">
          Browse all available equipment for borrowing
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={6} />}>
        <EquipmentCatalogContent />
      </Suspense>
    </div>
  );
}
